import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Clock, Filter, RefreshCcw, ShieldAlert } from 'lucide-react';
import { useMemo, useState } from 'react';

import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { adminMonitoringApi } from '../services/adminMonitoringApi.js';

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

function presenceChip(presence) {
  if (presence === 'active') return { label: 'Active', cls: 'bg-emerald-600/90 text-white' };
  if (presence === 'idle') return { label: 'Idle', cls: 'bg-amber-500/90 text-white' };
  if (presence === 'submitted') return { label: 'Submitted', cls: 'bg-white/70 text-ink-700' };
  return { label: 'Not Started', cls: 'bg-white/70 text-ink-700' };
}

export default function AdminLiveMonitoringPage() {
  const { token } = useAdminAuth();

  const [examId, setExamId] = useState('');
  const [q, setQ] = useState('');
  const [riskMin, setRiskMin] = useState(0);
  const [expanded, setExpanded] = useState(() => new Set());

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-live-monitoring', examId, q, riskMin],
    queryFn: () => adminMonitoringApi.live(token, { examId, q, riskMin, limit: 220 }),
    refetchInterval: 3000,
  });

  const exams = data?.exams || [];

  const rows = useMemo(() => {
    const r = data?.rows || [];
    return r.slice().sort((a, b) => {
      const ar = Number(a?.riskScore || 0);
      const br = Number(b?.riskScore || 0);
      if (br !== ar) return br - ar;
      const at = a?.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
      const bt = b?.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
      return bt - at;
    });
  }, [data]);

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.presence === 'active').length;
    const idle = rows.filter((r) => r.presence === 'idle').length;
    const flagged = rows.filter((r) => (r.riskScore || 0) >= 35).length;
    return { total, active, idle, flagged };
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-ink-600">Monitoring</div>
          <div className="mt-1 flex items-center gap-2 text-2xl font-extrabold text-ink-900">
            <Activity className="h-6 w-6" />
            Live Monitoring
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-2xl bg-white/70 px-4 py-2 text-xs font-semibold text-ink-700 shadow-soft">
            Server time: {data?.serverTime ? fmt(data.serverTime) : '—'}
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
                <label className="block w-full md:w-[340px]">
                  <div className="mb-1.5 text-xs font-semibold text-ink-700">Exam</div>
                  <select
                    value={examId}
                    onChange={(e) => setExamId(e.target.value)}
                    className="w-full rounded-2xl border border-ink-100 bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="">All exams</option>
                    {exams.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.title}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="w-full md:max-w-[360px]">
                  <Input label="Search user" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or email…" />
                </div>

                <label className="block w-full md:w-[220px]">
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
              </div>

              <div className="flex items-center justify-between gap-2 md:justify-end">
                <div className="inline-flex items-center gap-2 rounded-2xl bg-white/60 px-4 py-2 text-xs font-semibold text-ink-700">
                  <Filter className="h-4 w-4" />
                  Polling every 3s
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="mt-4 space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/60" />
                ))}
              </div>
            ) : error ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error.message}
              </div>
            ) : rows.length ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/60">
                <div className="grid grid-cols-12 bg-white/50 px-4 py-3 text-xs font-semibold text-ink-600">
                  <div className="col-span-4">User</div>
                  <div className="col-span-2">Presence</div>
                  <div className="col-span-2">Risk</div>
                  <div className="col-span-2">Violations</div>
                  <div className="col-span-2 text-right">Last activity</div>
                </div>

                <div className="divide-y divide-white/60 bg-white/40">
                  {rows.map((r, idx) => {
                    const risk = Number(r.riskScore || 0);
                    const sev = severityFromRisk(risk);
                    const pres = presenceChip(r.presence);
                    const isOpen = expanded.has(r.attemptId);

                    return (
                      <div key={r.attemptId}>
                        <motion.button
                          type="button"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: Math.min(0.2, idx * 0.01) }}
                          className="grid w-full grid-cols-12 items-center px-4 py-3 text-left transition hover:bg-white/50"
                          onClick={() => {
                            setExpanded((prev) => {
                              const next = new Set(prev);
                              if (next.has(r.attemptId)) next.delete(r.attemptId);
                              else next.add(r.attemptId);
                              return next;
                            });
                          }}
                        >
                          <div className="col-span-4 min-w-0">
                            <div className="truncate text-sm font-extrabold text-ink-900">
                              {r.user?.name || r.user?.email || 'Unknown user'}
                            </div>
                            <div className="truncate text-xs text-ink-500">{r.user?.email || '—'}</div>
                          </div>

                          <div className="col-span-2">
                            <div className={`inline-flex rounded-2xl px-3 py-1 text-[11px] font-extrabold shadow-soft ${pres.cls}`}>
                              {pres.label}
                            </div>
                          </div>

                          <div className="col-span-2">
                            <div className={`inline-flex items-center gap-2 rounded-2xl px-3 py-1 text-[11px] font-extrabold shadow-soft ${sev.cls}`}>
                              <ShieldAlert className="h-3.5 w-3.5" />
                              {sev.label} • {risk}
                            </div>
                          </div>

                          <div className="col-span-2 text-xs font-semibold text-ink-700">
                            {r.violationsCount || 0}
                          </div>

                          <div className="col-span-2 text-right text-xs text-ink-600">
                            {fmt(r.lastActivityAt)}
                          </div>
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
                                  <div className="text-xs font-semibold text-ink-600">Exam</div>
                                  <div className="mt-1 text-sm font-extrabold text-ink-900">
                                    {r.exam?.title || '—'}
                                  </div>
                                  <div className="mt-1 text-xs text-ink-500">
                                    {r.exam?.startAt ? fmt(r.exam.startAt) : '—'} → {r.exam?.endAt ? fmt(r.exam.endAt) : '—'}
                                  </div>
                                </div>

                                <div className="rounded-2xl bg-white/70 px-4 py-3">
                                  <div className="flex items-center justify-between">
                                    <div className="text-xs font-semibold text-ink-600">Attempt timeline</div>
                                    <Clock className="h-4 w-4 text-ink-500" />
                                  </div>
                                  <div className="mt-2 space-y-1 text-xs text-ink-600">
                                    <div>
                                      <span className="font-semibold text-ink-800">Started:</span> {fmt(r.startedAt)}
                                    </div>
                                    <div>
                                      <span className="font-semibold text-ink-800">Submitted:</span> {fmt(r.submittedAt)}
                                    </div>
                                    <div>
                                      <span className="font-semibold text-ink-800">Last activity:</span> {fmt(r.lastActivityAt)}
                                    </div>
                                  </div>
                                </div>

                                <div className="rounded-2xl bg-white/70 px-4 py-3">
                                  <div className="text-xs font-semibold text-ink-600">Last violation</div>
                                  {r.lastViolation ? (
                                    <div className="mt-2">
                                      <div className="text-sm font-extrabold text-ink-900">{r.lastViolation.type}</div>
                                      <div className="mt-1 text-xs text-ink-500">{fmt(r.lastViolation.at)}</div>
                                      <div className="mt-2 rounded-2xl bg-white/60 px-3 py-2 text-[11px] text-ink-700">
                                        {r.lastViolation.meta ? JSON.stringify(r.lastViolation.meta) : '—'}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="mt-2 rounded-2xl bg-white/60 px-4 py-3 text-sm text-ink-600">No violations</div>
                                  )}
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
              <div className="mt-4 rounded-2xl bg-white/60 px-4 py-4 text-sm text-ink-600">No live data yet.</div>
            )}
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
          <Card className="p-4">
            <div className="text-sm font-extrabold text-ink-900">Snapshot</div>
            <div className="mt-1 text-xs text-ink-500">Auto-updating KPIs</div>

            <div className="mt-4 space-y-2">
              <div className="rounded-2xl bg-white/60 px-4 py-3">
                <div className="text-xs font-semibold text-ink-600">Rows</div>
                <div className="mt-1 text-2xl font-extrabold text-ink-900">{stats.total}</div>
              </div>
              <div className="rounded-2xl bg-white/60 px-4 py-3">
                <div className="text-xs font-semibold text-ink-600">Active now</div>
                <div className="mt-1 text-2xl font-extrabold text-ink-900">{stats.active}</div>
              </div>
              <div className="rounded-2xl bg-white/60 px-4 py-3">
                <div className="text-xs font-semibold text-ink-600">Idle</div>
                <div className="mt-1 text-2xl font-extrabold text-ink-900">{stats.idle}</div>
              </div>
              <div className="rounded-2xl bg-white/60 px-4 py-3">
                <div className="text-xs font-semibold text-ink-600">Flagged (risk ≥ 35)</div>
                <div className="mt-1 text-2xl font-extrabold text-ink-900">{stats.flagged}</div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-white/60 px-4 py-3 text-xs text-ink-600">
              {isFetching ? 'Updating…' : 'Up to date'}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
