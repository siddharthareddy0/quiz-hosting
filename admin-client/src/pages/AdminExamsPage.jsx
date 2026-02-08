import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Rocket, SquarePen, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { adminExamsApi } from '../services/adminExamsApi.js';

function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AdminExamsPage() {
  const { token } = useAdminAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [q, setQ] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-exams'],
    queryFn: () => adminExamsApi.list(token),
  });

  const publishMut = useMutation({
    mutationFn: ({ id, published }) => (published ? adminExamsApi.unpublish(token, id) : adminExamsApi.publish(token, id)),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-exams'] });
      await qc.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => adminExamsApi.remove(token, id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-exams'] });
      await qc.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
    },
  });

  const items = useMemo(() => {
    const exams = data?.exams || [];
    const qq = q.trim().toLowerCase();
    if (!qq) return exams;
    return exams.filter((e) => (e.title || '').toLowerCase().includes(qq));
  }, [data, q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-ink-600">Exams</div>
          <div className="mt-1 text-2xl font-extrabold text-ink-900">Manage Exams</div>
        </div>
        <Button onClick={() => navigate('/admin/exams/new')}>
          <Plus className="h-4 w-4" />
          Create Exam
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-ink-900">All Exams</div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title…"
            className="w-full rounded-2xl border border-ink-100 bg-white/70 px-4 py-2 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100 sm:w-[320px]"
          />
        </div>

        {isLoading ? (
          <div className="mt-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/60" />
            ))}
          </div>
        ) : error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error.message}
          </div>
        ) : items.length ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/60">
            <div className="grid grid-cols-12 bg-white/50 px-4 py-3 text-xs font-semibold text-ink-600">
              <div className="col-span-4">Title</div>
              <div className="col-span-3">Window</div>
              <div className="col-span-2">Duration</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            <div className="divide-y divide-white/60 bg-white/40">
              {items.map((e, idx) => {
                const now = Date.now();
                const start = new Date(e.startAt).getTime();
                const end = new Date(e.endAt).getTime();
                const state = now < start ? 'Upcoming' : now > end ? 'Completed' : 'Active';

                return (
                  <motion.div
                    key={e._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(0.2, idx * 0.02) }}
                    className="grid grid-cols-12 items-center px-4 py-3"
                  >
                    <div className="col-span-4 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-extrabold text-ink-900">{e.title}</div>
                        <div
                          className={
                            'shrink-0 rounded-2xl px-2.5 py-1 text-[10px] font-extrabold ' +
                            (e.published
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                              : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200')
                          }
                          title={e.published ? 'Visible to users' : 'Hidden from users'}
                        >
                          {e.published ? 'PUBLISHED' : 'UNPUBLISHED'}
                        </div>
                      </div>
                      <div className="truncate text-xs text-ink-500">{e.questions?.length ?? 0} questions</div>
                    </div>
                    <div className="col-span-3 text-xs text-ink-600">
                      <div>{fmtDateTime(e.startAt)}</div>
                      <div className="text-ink-500">to {fmtDateTime(e.endAt)}</div>
                    </div>
                    <div className="col-span-2 text-xs font-semibold text-ink-700">{e.durationMinutes} min</div>
                    <div className="col-span-1">
                      <div className="inline-flex rounded-2xl bg-white/70 px-3 py-1 text-[11px] font-bold text-ink-700 shadow-soft">
                        {state}
                      </div>
                    </div>
                    <div className="col-span-2 flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="subtle"
                        onClick={() => publishMut.mutate({ id: e._id, published: e.published })}
                        disabled={publishMut.isPending}
                        title={e.published ? 'Unpublish (hide from users)' : 'Publish (show to users)'}
                      >
                        <Rocket className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/exams/${e._id}/edit`)}>
                        <SquarePen className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          const ok = window.confirm('Delete this exam? This cannot be undone.');
                          if (ok) deleteMut.mutate(e._id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-white/60 px-4 py-4 text-sm text-ink-600">
            No exams yet. Create your first exam.
          </div>
        )}
      </Card>
    </div>
  );
}
