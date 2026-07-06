import { useEffect, useState } from 'react';
import { Check, X, Star, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import type { Review } from '../../lib/types';
import { formatDate } from '../../lib/types';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';

interface ReviewWithUser extends Review {
  user_id: string;
}

export default function AdminReviews() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  const load = async () => {
    setLoading(true);
    let query = supabase.from('reviews').select('*, book:books(title, cover_url)').order('created_at', { ascending: false });
    if (filter !== 'all') query = query.eq('status', filter);
    const { data } = await query;
    // Fetch user profiles separately
    const reviewsData = (data as ReviewWithUser[]) || [];
    if (reviewsData.length > 0) {
      const userIds = [...new Set(reviewsData.map(r => r.user_id))];
      const { data: profilesData } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds);
      const profileMap = new Map((profilesData || []).map(p => [p.id, p]));
      const reviewsWithUsers = reviewsData.map(r => ({
        ...r,
        user: profileMap.get(r.user_id) || { full_name: 'Anonymous', avatar_url: null }
      }));
      setReviews(reviewsWithUsers);
    } else {
      setReviews([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase.from('reviews').update({ status }).eq('id', id);
    if (error) toast(error.message, 'error');
    else { toast(`Review ${status}`, 'success'); load(); }
  };

  const tabs = ['pending', 'approved', 'rejected', 'all'] as const;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-900">Reviews Moderation</h1>
        <p className="mt-1 text-sm text-ink-500">Approve or reject customer reviews.</p>
      </div>

      <div className="mb-4 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition ${
              filter === t ? 'bg-emerald-700 text-white' : 'border border-ink-200 bg-white text-ink-700 hover:bg-ink-50'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 skeleton rounded-xl" />)}</div>
      ) : reviews.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No reviews found" description={`No ${filter} reviews at this time.`} />
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex items-start gap-4">
                {r.user?.avatar_url ? (
                  <img
                    src={r.user.avatar_url}
                    alt="Avatar"
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
                    {(r.user?.full_name || 'A').charAt(0)}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ink-900">{r.user?.full_name || 'Anonymous'}</p>
                      <p className="text-xs text-ink-500">on {r.book?.title} • {formatDate(r.created_at)}</p>
                    </div>
                    <Badge variant={r.status === 'approved' ? 'emerald' : r.status === 'pending' ? 'gold' : 'red'}>{r.status}</Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < r.rating ? 'fill-gold-400 text-gold-400' : 'fill-ink-200 text-ink-200'}`} />
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-ink-700">{r.comment}</p>
                  {r.status === 'pending' && (
                    <div className="mt-4 flex gap-2">
                      <button onClick={() => updateStatus(r.id, 'approved')} className="btn-primary py-2 text-sm">
                        <Check className="h-4 w-4" /> Approve
                      </button>
                      <button onClick={() => updateStatus(r.id, 'rejected')} className="btn-outline py-2 text-sm text-red-600 hover:bg-red-50">
                        <X className="h-4 w-4" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
