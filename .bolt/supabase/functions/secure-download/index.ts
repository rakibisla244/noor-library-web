import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const bookId = url.searchParams.get("book_id");

    if (!bookId) {
      return new Response(
        JSON.stringify({ error: "book_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Identify the caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      console.error("[secure-download] Auth failed:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    console.log(`[secure-download] ====== START REQUEST ======`);
    console.log(`[secure-download] User: ${userId}`);
    console.log(`[secure-download] Book: ${bookId}`);

    // ── Permission check ─────────────────────────────────────────────────────
    // Strategy 1: direct download record (individual book purchase OR package purchase)
    console.log(`[secure-download] Strategy 1: Checking downloads table...`);
    const { data: dlRecord, error: dlError } = await adminClient
      .from("downloads")
      .select("id, order_id")
      .eq("user_id", userId)
      .eq("book_id", bookId)
      .maybeSingle();

    if (dlError) {
      console.error("[secure-download] Downloads lookup error:", dlError.message);
    }
    console.log(`[secure-download] Strategy 1 result:`, dlRecord ? `FOUND (order: ${dlRecord.order_id})` : 'NOT FOUND');

    let hasAccess = !!dlRecord;

    // Strategy 2: book is inside a package the user purchased (approved order)
    // Use RPC to check package access with reliable SQL
    if (!hasAccess) {
      console.log(`[secure-download] Strategy 2: Checking package access via RPC...`);
      const { data: pkgResult, error: pkgError } = await adminClient.rpc('check_package_book_access', {
        p_user_id: userId,
        p_book_id: bookId
      });

      if (pkgError) {
        console.error("[secure-download] RPC error:", pkgError.message);
        // Fallback: Try direct query approach
        console.log(`[secure-download] Falling back to direct query...`);

        // Step 1: Get user's approved package order items
        const { data: userPackageOrders, error: orderError } = await adminClient
          .from("orders")
          .select(`id, order_items!inner(id, package_id, is_package)`)
          .eq("user_id", userId)
          .eq("payment_status", "approved");

        if (orderError) {
          console.error("[secure-download] Order query error:", orderError.message);
        } else if (userPackageOrders && userPackageOrders.length > 0) {
          console.log(`[secure-download] Found ${userPackageOrders.length} approved orders`);
          // Get package IDs from order items
          const packageIds = userPackageOrders
            .flatMap((o: any) => o.order_items)
            .filter((item: any) => item.is_package && item.package_id)
            .map((item: any) => item.package_id);

          if (packageIds.length > 0) {
            console.log(`[secure-download] Checking package_ids:`, packageIds);
            // Check if book is in any of these packages
            const { data: pkgItems, error: piError } = await adminClient
              .from("package_items")
              .select("package_id")
              .in("package_id", packageIds)
              .eq("book_id", bookId)
              .limit(1);

            if (piError) {
              console.error("[secure-download] Package items query error:", piError.message);
            } else {
              hasAccess = (pkgItems ?? []).length > 0;
              console.log(`[secure-download] Book found in package_items: ${hasAccess}`);
            }
          }
        }
      } else {
        hasAccess = pkgResult === true;
        console.log(`[secure-download] RPC result: ${hasAccess}`);
      }
    }

    // Backfill download record if access granted but no record exists
    if (hasAccess && !dlRecord) {
      console.log(`[secure-download] Backfilling download record...`);
      // Find the order_id to use for the download record
      const { data: userOrders } = await adminClient
        .from("orders")
        .select(`id, order_items!inner(package_id, is_package)`)
        .eq("user_id", userId)
        .eq("payment_status", "approved");

      if (userOrders && userOrders.length > 0) {
        for (const order of userOrders) {
          const pkgItems = (order as any).order_items.filter((i: any) => i.is_package && i.package_id);
          if (pkgItems.length > 0) {
            // Check if this package contains the book
            const { data: containsBook } = await adminClient
              .from("package_items")
              .select("id")
              .eq("package_id", pkgItems[0].package_id)
              .eq("book_id", bookId)
              .maybeSingle();

            if (containsBook) {
              const { error: insertErr } = await adminClient
                .from("downloads")
                .insert({ user_id: userId, book_id: bookId, order_id: order.id });

              if (insertErr) {
                console.log(`[secure-download] Backfill insert result: ${insertErr.message}`);
              } else {
                console.log(`[secure-download] Backfilled download for order ${order.id}`);
              }
              break;
            }
          }
        }
      }
    }

    console.log(`[secure-download] Final access decision: ${hasAccess ? 'GRANTED' : 'DENIED'}`);

    if (!hasAccess) {
      console.log(`[secure-download] Access DENIED for user ${userId} book ${bookId}`);
      return new Response(
        JSON.stringify({ error: "You have not purchased this book" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Fetch book file path ─────────────────────────────────────────────────
    const { data: book, error: bookError } = await adminClient
      .from("books")
      .select("file_url, title")
      .eq("id", bookId)
      .maybeSingle();

    if (bookError || !book) {
      console.error("[secure-download] book lookup error:", bookError?.message);
      return new Response(
        JSON.stringify({ error: "Book not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!book.file_url) {
      console.log(`[secure-download] Book ${bookId} has no file_url`);
      return new Response(
        JSON.stringify({ error: "File not available for this book" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[secure-download] Generating signed URL for book: ${book.title}`);

    // The file_url stored for full PDFs is the storage path (not a public URL).
    // Generate a signed URL valid for 10 minutes.
    const { data: signedData, error: signError } = await adminClient.storage
      .from("full-pdfs")
      .createSignedUrl(book.file_url, 600);

    if (signError || !signedData?.signedUrl) {
      console.error("[secure-download] signed URL error:", signError?.message);

      // Fallback: maybe file_url is already a full public URL (older books)
      if (book.file_url.startsWith("http")) {
        console.log("[secure-download] Returning raw file_url as fallback");
        return new Response(
          JSON.stringify({ url: book.file_url }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to generate download link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment download count (fire-and-forget)
    adminClient
      .from("books")
      .update({ download_count: adminClient.rpc("download_count_increment", { book_id_param: bookId }) })
      .eq("id", bookId)
      .then(() => {}, () => {});

    console.log(`[secure-download] SUCCESS — user ${userId} downloading book ${bookId} (${book.title})`);

    return new Response(
      JSON.stringify({ url: signedData.signedUrl, title: book.title }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[secure-download] Unhandled error:", err?.message ?? err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
