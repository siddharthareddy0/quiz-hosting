import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Calculator, RefreshCcw, ScrollText, Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';

import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { adminExamsApi } from '../services/adminExamsApi.js';
import { adminResultsApi } from '../services/adminResultsApi.js';

function fmt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function Stat({ label, value }) {
  return (
    <Card className="p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="text-xs font-semibold text-ink-600">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-ink-900">{value}</div>
    </Card>
  );
}

export default function AdminResultsPage() {
  const { token } = useAdminAuth();
  const qc = useQueryClient();

  const [examId, setExamId] = useState('');
  const [q, setQ] = useState('');

  const { data: examsData } = useQuery({
    queryKey: ['admin-exams-results'],
    queryFn: () => adminExamsApi.list(token),
  });

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-results', examId, q],
    queryFn: () => adminResultsApi.examResults(token, examId, { q, limit: 250 }),
    enabled: Boolean(examId),
    refetchInterval: examId ? 6000 : false,
  });

  const recalcMut = useMutation({
    mutationFn: () => adminResultsApi.recalculate(token, examId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-results', examId] });
      await qc.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
    },
  });

  const leaderboardMut = useMutation({
    mutationFn: (payload) => adminResultsApi.updateLeaderboard(token, examId, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-results', examId] });
    },
  });

  const exams = examsData?.exams || [];

  const rows = data?.rows || [];
  const stats = data?.stats || { total: 0, avgScore: 0, bestScore: 0, worstScore: 0, flagged: 0, buckets: [] };

  const chart = useMemo(() => {
    return (stats.buckets || []).map((b) => ({ name: b.label, value: b.count }));
  }, [stats]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-ink-600">Results</div>
          <div className="mt-1 flex items-center gap-2 text-2xl font-extrabold text-ink-900">
            <ScrollText className="h-6 w-6" />
            Results & Leaderboard
          </div>
          <div className="mt-1 text-sm text-ink-600">Evaluation, analytics, and leaderboard visibility controls.</div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="subtle" onClick={() => refetch()} disabled={!examId || isFetching}>
            <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="subtle"
            disabled={!examId || recalcMut.isPending}
            onClick={() => recalcMut.mutate()}
            title="Recalculate all submitted attempts for this exam"
          >
            <Calculator className="h-4 w-4" />
            {recalcMut.isPending ? 'Recalculating…' : 'Recalculate'}
          </Button>
        </div>
      </div>

      <Card className="p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-end">
          <label className="block md:col-span-2">
            <div className="mb-1.5 text-xs font-semibold text-ink-700">Select Exam</div>
            <select
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
              className="w-full rounded-2xl border border-ink-100 bg-white/70 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Choose an exam</option>
              {exams.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.title}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-2xl border border-white/70 bg-white/60 px-4 py-3">
            <div className="text-xs font-semibold text-ink-600">Window</div>
            <div className="mt-1 text-xs font-semibold text-ink-800">
              {examId ? `${fmt(data?.exam?.startAt)} → ${fmt(data?.exam?.endAt)}` : '—'}
            </div>
            <div className="mt-1 text-[11px] text-ink-500">
              Neg: {data?.exam?.negativeMarkingEnabled ? `On (${data?.exam?.negativeMarkPerQuestion || 0})` : 'Off'}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <Input label="Search user" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or email…" />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-white/70 bg-white/60 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold text-ink-900">Leaderboard</div>
                <div className="mt-1 text-xs text-ink-500">Enable/disable and publish/hide leaderboard visibility</div>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-blue-600/15 to-violet-600/10">
                <Trophy className="h-4 w-4 text-ink-900" />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={data?.exam?.leaderboardEnabled ? 'primary' : 'subtle'}
                disabled={!examId || leaderboardMut.isPending}
                onClick={() => leaderboardMut.mutate({ leaderboardEnabled: !data?.exam?.leaderboardEnabled })}
              >
                {data?.exam?.leaderboardEnabled ? 'Enabled' : 'Disabled'}
              </Button>

              <Button
                size="sm"
                variant={data?.exam?.leaderboardVisible ? 'primary' : 'subtle'}
                disabled={!examId || leaderboardMut.isPending}
                onClick={() => leaderboardMut.mutate({ leaderboardVisible: !data?.exam?.leaderboardVisible })}
              >
                {data?.exam?.leaderboardVisible ? 'Visible' : 'Hidden'}
              </Button>
            </div>

            <div className="mt-3 text-xs text-ink-600">
              Current: {data?.exam?.leaderboardEnabled ? 'Enabled' : 'Disabled'} • {data?.exam?.leaderboardVisible ? 'Visible' : 'Hidden'}
            </div>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/60 px-4 py-4">
            <div className="text-sm font-extrabold text-ink-900">Histogram</div>
            <div className="mt-1 text-xs text-ink-500">Score distribution by percent bucket</div>

            <div className="mt-4 h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="rgba(37,99,235,0.55)" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </Card>

      {examId ? (
        isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="h-[88px] animate-pulse bg-white/60" />
            ))}
          </div>
        ) : error ? (
          <Card className="p-6">
            <div className="text-sm font-semibold text-ink-900">Failed to load results</div>
            <div className="mt-1 text-sm text-ink-600">{error.message}</div>
          </Card>
        ) : (
          <div className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 gap-4 md:grid-cols-5">
              <Stat label="Submitted" value={stats.total} />
              <Stat label="Avg score" value={stats.avgScore} />
              <Stat label="Best" value={stats.bestScore} />
              <Stat label="Worst" value={stats.worstScore} />
              <Stat label="Flagged" value={stats.flagged} />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-4">
                <div className="text-sm font-extrabold text-ink-900">Results table</div>
                <div className="mt-1 text-xs text-ink-500">Top submissions (sorted by score)</div>

                {rows.length ? (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-white/60">
                    <div className="grid grid-cols-12 bg-white/50 px-4 py-3 text-xs font-semibold text-ink-600">
                      <div className="col-span-1">#</div>
                      <div className="col-span-4">User</div>
                      <div className="col-span-2">Score</div>
                      <div className="col-span-2">%</div>
                      <div className="col-span-1">Viol.</div>
                      <div className="col-span-2 text-right">Submitted</div>
                    </div>

                    <div className="divide-y divide-white/60 bg-white/40">
                      {rows.map((r, idx) => (
                        <motion.div
                          key={r.attemptId}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, delay: Math.min(0.2, idx * 0.01) }}
                          className="grid grid-cols-12 items-center px-4 py-3"
                        >
                          <div className="col-span-1 text-xs font-extrabold text-ink-900">{r.rank}</div>
                          <div className="col-span-4 min-w-0">
                            <div className="truncate text-sm font-extrabold text-ink-900">{r.user?.name || r.user?.email || 'User'}</div>
                            <div className="truncate text-xs text-ink-500">{r.user?.email || '—'}</div>
                          </div>
                          <div className="col-span-2 text-xs font-semibold text-ink-700">
                            {r.score} / {r.maxScore}
                          </div>
                          <div className="col-span-2 text-xs font-semibold text-ink-700">{r.percent}%</div>
                          <div className="col-span-1 text-xs font-semibold text-ink-700">{r.violationsCount ?? 0}</div>
                          <div className="col-span-2 text-right text-xs text-ink-600">{fmt(r.submittedAt)}</div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl bg-white/60 px-4 py-6 text-sm text-ink-600">No submissions yet.</div>
                )}
              </Card>
            </motion.div>
          </div>
        )
      ) : (
        <Card className="p-6">
          <div className="text-sm font-semibold text-ink-900">Select an exam</div>
          <div className="mt-1 text-sm text-ink-600">Choose an exam to view results, analytics, and leaderboard controls.</div>
        </Card>
      )}
    </div>
  );
}
