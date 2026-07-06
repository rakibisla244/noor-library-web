import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FROM_EMAIL = "Noor Library <onboarding@resend.dev>";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Drain up to 20 pending emails
    const { data: queue, error: qErr } = await admin
      .from("admin_email_queue")
      .select("id, notification_id, to_email, subject, html_body")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(20);

    if (qErr) throw qErr;
    if (!queue || queue.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No pending emails" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!resendApiKey) {
      // Mark as failed with a clear reason so admins see the missing secret
      await admin
        .from("admin_email_queue")
        .update({ status: "failed", error: "RESEND_API_KEY not configured" })
        .in(
          "id",
          queue.map((q) => q.id)
        );
      return new Response(
        JSON.stringify({
          sent: 0,
          failed: queue.length,
          error: "RESEND_API_KEY not configured. Set it in Edge Function secrets.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sent = 0;
    let failed = 0;
    for (const item of queue) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: item.to_email,
            subject: item.subject,
            html: item.html_body,
          }),
        });

        if (!res.ok) {
          const errBody = await res.text();
          await admin
            .from("admin_email_queue")
            .update({ status: "failed", error: `Resend ${res.status}: ${errBody.slice(0, 200)}` })
            .eq("id", item.id);
          failed++;
          continue;
        }

        await admin
          .from("admin_email_queue")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", item.id);

        // Mark the linked notification's admin_email_sent flag
        if (item.notification_id) {
          await admin
            .from("notifications")
            .update({ admin_email_sent: true })
            .eq("id", item.notification_id);
        }
        sent++;
      } catch (err) {
        await admin
          .from("admin_email_queue")
          .update({ status: "failed", error: (err as Error).message })
          .eq("id", item.id);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ sent, failed, total: queue.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
