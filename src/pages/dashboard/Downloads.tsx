import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime } from '../../lib/types';
import EmptyState from '../../components/ui/EmptyState';

interface DownloadRow {
  id: string;
  created_at: string;
  order_id: string | null;
  book: { id: string; title: string; cover_url: string; slug: string; file_url: string };
}

export default function Downloads() {
  const { user } = useAuth();
  const [downloads, setDownloads] = useState<DownloadRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from('downloads')
        .select('id, created_at, order_id, book:books(id, title, cover_url, slug, file_url)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setDownloads((data as unknown as DownloadRow[]) || []);
      setLoading(false);
    })();
  }, [user]);

  const reDownload = async (item: DownloadRow) => {
    if (!user || !item.book) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Use secure download endpoint
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/secure-download?book_id=${item.book.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) window.open(data.url, '_blank');
      }
    } catch (err) {
      // Silent fail for re-download
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-900">Download History</h1>
        <p className="mt-1 text-sm text-ink-500">A log of all your eBook downloads for security and tracking.</p>
      </div>

      {loading ? (
        <div className="card divide-y divide-ink-100">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 skeleton" />)}
        </div>
      ) : downloads.length === 0 ? (
        <EmptyState
          icon={Download}
          title="No downloads yet"
          description="Your download history will appear here once you start downloading purchased books."
          action={<Link to="/dashboard/purchased-books" className="btn-primary">View Purchased Books</Link>}
        />
      ) : (
        <div className="card divide-y divide-ink-100">
          {downloads.map((d) => (
            <div key={d.id} className="flex items-center gap-4 p-4">
              <img src={d.book?.cover_url} alt={d.book?.title} className="h-14 w-10 rounded-lg object-cover sm:h-16 sm:w-12" />
              <div className="flex-1 min-w-0">
                <Link to={`/book/${d.book?.slug}`} className="font-semibold text-ink-900 hover:text-emerald-700">
                  {d.book?.title}
                </Link>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-500">
                  <Calendar className="h-3.5 w-3.5" /> {formatDateTime(d.created_at)}
                </p>
              </div>
              <button onClick={() => reDownload(d)} className="btn-outline py-2 px-3 text-xs sm:px-4">
                <Download className="h-4 w-4" /> Re-download
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
