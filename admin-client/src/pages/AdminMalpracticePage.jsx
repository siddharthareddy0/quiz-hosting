import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Filter, RefreshCcw, ShieldAlert, UserRoundX } from 'lucide-react';
import { useMemo, useState } from 'react';

import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import Input from '../components/ui/Input.jsx';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { adminExamsApi } from '../services/adminExamsApi.js';
import { adminMalpracticeApi } from '../services/adminMalpracticeApi.js';

function fmt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function severityFromRisk(risk) {
  if (risk >= 70) return { label: 'High', cls: 'bg-rose-600/90 text-white' };
  if (risk >= 35) return { label: 'Medium', cls: 'bg-amber-500/90 text-white' };
  if (risk > 0) return { label: 'Low', cls: 'bg-blue-600/85 text-white' };
  return { label: 'None', cls: 'bg-white/70 text-ink-700' };
}

function statusChip(status) {
  if (status === 'disqualified') return { label: 'Disqualified', cls: 'bg-rose-600/90 text-white' };
  if (status === 'approved') return { label: 'Approved', cls: 'bg-emerald-600/90 text-white' };
  return { label: 'Under review', cls: 'bg-amber-500/90 text-white' };
}

export default function AdminMalpracticePage() {
  const { token } = useAdminAuth();
  const qc = useQueryClient();

  const [examId, setExamId] = useState('');
  const [q, setQ] = useState('');
  const [riskMin, setRiskMin] = useState(35);
  const [status, setStatus] = useState('');
  const [expanded, setExpanded] = useState(() => new Set());

  const [confirm, setConfirm] = useState({ open: false, attemptId: '', status: '', title: '', message: '' });

  const [notesByAttempt, setNotesByAttempt] = useState(() => ({}));

  const { data: examsData } = useQuery({
    queryKey: ['admin-exams-malpractice'],
    queryFn: () => adminExamsApi.list(token),
  });

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-malpractice-cases', examId, q, riskMin, status],
    queryFn: () => adminMalpracticeApi.listCases(token, { examId, q, riskMin, status, limit: 220 }),
    refetchInterval: 3000,
  });

  const setStatusMut = useMutation({
    mutationFn: ({ attemptId, statusValue, note }) => adminMalpracticeApi.setStatus(token, attemptId, { status: statusValue, note }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-malpractice-cases'] });
      await qc.invalidateQueries({ queryKey: ['admin-live-monitoring'] });
    },
  });

  const exams = examsData?.exams || [];

  const cases = useMemo(() => {
    const items = data?.cases || [];
    return items.slice().sort((a, b) => {
      const ar = Number(a?.riskScore || 0);
      const br = Number(b?.riskScore || 0);
      if (br !== ar) return br - ar;
      const at = a?.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bt = b?.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bt - at;
    });
  }, [data]);

  const stats = useMemo(() => {
    const total = cases.length;
    const high = cases.filter((c) => (c.riskScore || 0) >= 70).length;
    const medium = cases.filter((c) => (c.riskScore || 0) >= 35 && (c.riskScore || 0) < 70).length;
    const disqualified = cases.filter((c) => c.malpracticeStatus === 'disqualified').length;
    return { total, high, medium, disqualified };
  }, [cases]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-ink-600">Integrity</div>
          <div className="mt-1 flex items-center gap-2 text-2xl font-extrabold text-ink-900">
            <ShieldAlert className="h-6 w-6" />
            Malpractice
          </div>
          <div className="mt-1 text-sm text-ink-600">Review violation timelines, filter by risk, and take actions.</div>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-2xl bg-white/70 px-4 py-2 text-xs font-semibold text-ink-700 shadow-soft">
            Polling every 3s
          </div>
          <Button variant="subtle" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-3">
          <Card className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-end">
                <label className="block w-full md:w-[320px]">
                  <div className="mb-1.5 text-xs font-semibold text-ink-700">Exam</div>
                  <select
                    value={examId}
                    onChange={(e) => setExamId(e.target.value)}
                    className="w-full rounded-2xl border border-ink-100 bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="">All exams</option>
                    {exams.map((e) => (
                      <option key={e._id} value={e._id}>
                        {e.title}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="w-full md:max-w-[320px]">
                  <Input label="Search user" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or email…" />
                </div>

                <label className="block w-full md:w-[240px]">
                  <div className="mb-1.5 text-xs font-semibold text-ink-700">Risk min</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={riskMin}
                      onChange={(e) => setRiskMin(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="min-w-[44px] rounded-2xl bg-white/80 px-3 py-2 text-xs font-extrabold text-ink-900 shadow-soft">
                      {riskMin}
                    </div>
                  </div>
                </label>

                <label className="block w-full md:w-[220px]">
                  <div className="mb-1.5 text-xs font-semibold text-ink-700">Status</div>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-2xl border border-ink-100 bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="">All</option>
                    <option value="under_review">Under review</option>
                    <option value="approved">Approved</option>
                    <option value="disqualified">Disqualified</option>
                  </select>
                </label>
              </div>

              <div className="inline-flex items-center gap-2 rounded-2xl bg-white/60 px-4 py-2 text-xs font-semibold text-ink-700">
                <Filter className="h-4 w-4" />
                Sorted by risk
              </div>
            </div>

            {isLoading ? (
              <div className="mt-4 space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/60" />
                ))}
              </div>
            ) : error ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error.message}</div>
            ) : cases.length ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/60">
                <div className="grid grid-cols-12 bg-white/50 px-4 py-3 text-xs font-semibold text-ink-600">
                  <div className="col-span-4">User</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Risk</div>
                  <div className="col-span-2">Violations</div>
                  <div className="col-span-2 text-right">Last violation</div>
                </div>

                <div className="divide-y divide-white/60 bg-white/40">
                  {cases.map((c, idx) => {
                    const risk = Number(c.riskScore || 0);
                    const sev = severityFromRisk(risk);
                    const st = statusChip(c.malpracticeStatus);
                    const isOpen = expanded.has(c.attemptId);

                    return (
                      <div key={c.attemptId}>
                        <motion.button
                          type="button"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: Math.min(0.2, idx * 0.01) }}
                          className="grid w-full grid-cols-12 items-center px-4 py-3 text-left transition hover:bg-white/50"
                          onClick={() => {
                            setExpanded((prev) => {
                              const next = new Set(prev);
                              if (next.has(c.attemptId)) next.delete(c.attemptId);
                              else next.add(c.attemptId);
                              return next;
                            });
                          }}
                        >
                          <div className="col-span-4 min-w-0">
                            <div className="truncate text-sm font-extrabold text-ink-900">{c.user?.name || c.user?.email || 'Unknown user'}</div>
                            <div className="truncate text-xs text-ink-500">{c.user?.email || '—'} • {c.exam?.title || '—'}</div>
                          </div>

                          <div className="col-span-2">
                            <div className={`inline-flex rounded-2xl px-3 py-1 text-[11px] font-extrabold shadow-soft ${st.cls}`}>{st.label}</div>
                          </div>

                          <div className="col-span-2">
                            <div className={`inline-flex items-center gap-2 rounded-2xl px-3 py-1 text-[11px] font-extrabold shadow-soft ${sev.cls}`}>
                              <ShieldAlert className="h-3.5 w-3.5" />
                              {sev.label} • {risk}
                            </div>
                          </div>

                          <div className="col-span-2 text-xs font-semibold text-ink-700">{c.violationsCount || 0}</div>

                          <div className="col-span-2 text-right text-xs text-ink-600">{fmt(c.lastViolation?.at)}</div>
                        </motion.button>

                        <AnimatePresence initial={false}>
                          {isOpen ? (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="overflow-hidden"
                            >
                              <div className="grid grid-cols-1 gap-3 bg-white/40 px-4 pb-4 md:grid-cols-3">
                                <div className="rounded-2xl bg-white/70 px-4 py-3">
                                  <div className="text-xs font-semibold text-ink-600">Timeline</div>
                                  <div className="mt-2 space-y-1 text-xs text-ink-600">
                                    <div>
                                      <span className="font-semibold text-ink-800">Started:</span> {fmt(c.startedAt)}
                                    </div>
                                    <div>
                                      <span className="font-semibold text-ink-800">Submitted:</span> {fmt(c.submittedAt)}
                                    </div>
                                    <div>
                                      <span className="font-semibold text-ink-800">Last update:</span> {fmt(c.updatedAt)}
                                    </div>
                                  </div>
                                  <div className="mt-3 rounded-2xl bg-white/60 px-3 py-2 text-[11px] text-ink-700">
                                    Decision: {st.label} • {fmt(c.decisionAt)}
                                  </div>
                                </div>

                                <div className="rounded-2xl bg-white/70 px-4 py-3 md:col-span-2">
                                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div>
                                      <div className="text-xs font-semibold text-ink-600">Violation timeline</div>
                                      <div className="mt-1 text-xs text-ink-500">Newest first</div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="subtle"
                                        disabled={setStatusMut.isPending}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setConfirm({
                                            open: true,
                                            attemptId: c.attemptId,
                                            status: 'under_review',
                                            title: 'Mark as Under Review',
                                            message: 'This will keep the case in the review queue.',
                                          });
                                        }}
                                      >
                                        Under review
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="primary"
                                        disabled={setStatusMut.isPending}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setConfirm({
                                            open: true,
                                            attemptId: c.attemptId,
                                            status: 'approved',
                                            title: 'Approve candidate',
                                            message: 'This will mark the attempt as cleared.',
                                          });
                                        }}
                                      >
                                        Approve
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="danger"
                                        disabled={setStatusMut.isPending}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setConfirm({
                                            open: true,
                                            attemptId: c.attemptId,
                                            status: 'disqualified',
                                            title: 'Disqualify candidate',
                                            message: 'This will mark the attempt as disqualified.',
                                          });
                                        }}
                                      >
                                        <UserRoundX className="h-4 w-4" />
                                        Disqualify
                                      </Button>
                                    </div>
                                  </div>

                                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                                    <label className="block md:col-span-1">
                                      <div className="mb-1.5 text-xs font-semibold text-ink-700">Decision note</div>
                                      <textarea
                                        value={notesByAttempt[c.attemptId] ?? c.decisionNote ?? ''}
                                        onChange={(e) =>
                                          setNotesByAttempt((prev) => ({
                                            ...prev,
                                            [c.attemptId]: e.target.value,
                                          }))
                                        }
                                        placeholder="Optional note…"
                                        className="h-24 w-full resize-none rounded-2xl border border-ink-100 bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                                      />
                                    </label>

                                    <div className="md:col-span-2">
                                      <div className="grid grid-cols-1 gap-2">
                                        {(c.violations || []).length ? (
                                          c.violations.map((v, i) => (
                                            <div key={`${v.type}-${v.at}-${i}`} className="rounded-2xl bg-white/60 px-4 py-3">
                                              <div className="flex items-center justify-between gap-3">
                                                <div className="text-xs font-extrabold text-ink-900">{v.type}</div>
                                                <div className="text-[11px] font-semibold text-ink-600">{fmt(v.at)}</div>
                                              </div>
                                              <div className="mt-2 rounded-2xl bg-white/60 px-3 py-2 text-[11px] text-ink-700">
                                                {v.meta ? JSON.stringify(v.meta) : '—'}
                                              </div>
                                            </div>
                                          ))
                                        ) : (
                                          <div className="rounded-2xl bg-white/60 px-4 py-4 text-sm text-ink-600">No violations</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl bg-white/60 px-4 py-4 text-sm text-ink-600">No cases match these filters.</div>
            )}
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
          <Card className="p-4">
            <div className="text-sm font-extrabold text-ink-900">Snapshot</div>
            <div className="mt-1 text-xs text-ink-500">Auto-updating KPIs</div>

            <div className="mt-4 space-y-2">
              <div className="rounded-2xl bg-white/60 px-4 py-3">
                <div className="text-xs font-semibold text-ink-600">Cases</div>
                <div className="mt-1 text-2xl font-extrabold text-ink-900">{stats.total}</div>
              </div>
              <div className="rounded-2xl bg-white/60 px-4 py-3">
                <div className="text-xs font-semibold text-ink-600">High risk</div>
                <div className="mt-1 text-2xl font-extrabold text-ink-900">{stats.high}</div>
              </div>
              <div className="rounded-2xl bg-white/60 px-4 py-3">
                <div className="text-xs font-semibold text-ink-600">Medium risk</div>
                <div className="mt-1 text-2xl font-extrabold text-ink-900">{stats.medium}</div>
              </div>
              <div className="rounded-2xl bg-white/60 px-4 py-3">
                <div className="text-xs font-semibold text-ink-600">Disqualified</div>
                <div className="mt-1 text-2xl font-extrabold text-ink-900">{stats.disqualified}</div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-white/60 px-4 py-3 text-xs text-ink-600">{isFetching ? 'Updating…' : 'Up to date'}</div>
          </Card>
        </motion.div>
      </div>

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        danger={confirm.status === 'disqualified'}
        confirmText={confirm.status === 'disqualified' ? 'Disqualify' : 'Confirm'}
        onCancel={() => setConfirm({ open: false, attemptId: '', status: '', title: '', message: '' })}
        onConfirm={() => {
          const note = notesByAttempt[confirm.attemptId] ?? '';
          setStatusMut.mutate({ attemptId: confirm.attemptId, statusValue: confirm.status, note });
          setConfirm({ open: false, attemptId: '', status: '', title: '', message: '' });
        }}
      />
    </div>
  );
}
