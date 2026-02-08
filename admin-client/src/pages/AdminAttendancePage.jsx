import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Download, RefreshCcw, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { adminAttendanceApi } from '../services/adminAttendanceApi.js';
import { adminExamsApi } from '../services/adminExamsApi.js';

function fmt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function statusChip(status) {
  if (status === 'submitted') return { label: 'Submitted', cls: 'bg-emerald-600/90 text-white' };
  if (status === 'present') return { label: 'Present', cls: 'bg-blue-600/85 text-white' };
  return { label: 'Absent', cls: 'bg-white/70 text-ink-700' };
}

function toCsv(rows) {
  const header = ['name', 'email', 'status', 'startedAt', 'submittedAt', 'violationsCount', 'malpracticeStatus'];
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    if (/[\n\r,\"]/g.test(s)) return `"${s.replaceAll('"', '""')}"`;
    return s;
  };

  const lines = [header.join(',')];
  for (const r of rows) {
    const u = r.user || {};
    lines.push(
      [
        escape(u.name || ''),
        escape(u.email || ''),
        escape(r.status || ''),
        escape(r.startedAt ? new Date(r.startedAt).toISOString() : ''),
        escape(r.submittedAt ? new Date(r.submittedAt).toISOString() : ''),
        escape(r.violationsCount ?? 0),
        escape(r.malpracticeStatus || ''),
      ].join(',')
    );
  }
  return lines.join('\n');
}

function downloadText(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminAttendancePage() {
  const { token } = useAdminAuth();

  const [examId, setExamId] = useState('');
  const [q, setQ] = useState('');

  const { data: examsData } = useQuery({
    queryKey: ['admin-exams-attendance'],
    queryFn: () => adminExamsApi.list(token),
  });

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-attendance', examId, q],
    queryFn: () => adminAttendanceApi.rows(token, { examId, q, limit: 800 }),
    enabled: Boolean(examId),
    refetchInterval: examId ? 5000 : false,
  });

  const exams = examsData?.exams || [];

  const rows = useMemo(() => {
    const r = data?.rows || [];
    return r.slice().sort((a, b) => {
      const order = { submitted: 0, present: 1, absent: 2 };
      const ao = order[a.status] ?? 9;
      const bo = order[b.status] ?? 9;
      if (ao !== bo) return ao - bo;
      const an = String(a.user?.name || a.user?.email || '');
      const bn = String(b.user?.name || b.user?.email || '');
      return an.localeCompare(bn);
    });
  }, [data]);

  const summary = data?.summary || { total: 0, present: 0, submitted: 0, absent: 0 };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-ink-600">Attendance</div>
          <div className="mt-1 flex items-center gap-2 text-2xl font-extrabold text-ink-900">
            <Users className="h-6 w-6" />
            Attendance
          </div>
          <div className="mt-1 text-sm text-ink-600">Present/absent is derived from attempt activity (polling).</div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="subtle" onClick={() => refetch()} disabled={!examId || isFetching}>
            <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="subtle"
            disabled={!rows.length}
            onClick={() => {
              const csv = toCsv(rows);
              const title = data?.exam?.title ? String(data.exam.title).replaceAll(/[^a-z0-9-_ ]/gi, '').trim() : 'attendance';
              downloadText(`${title || 'attendance'}.csv`, csv, 'text/csv;charset=utf-8');
            }}
          >
            <Download className="h-4 w-4" />
            Export CSV
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
            <div className="mt-1 text-[11px] text-ink-500">Mode: {data?.exam?.assignmentMode || '—'}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-white/60 px-4 py-3">
            <div className="text-xs font-semibold text-ink-600">Total</div>
            <div className="mt-1 text-2xl font-extrabold text-ink-900">{examId ? summary.total : '—'}</div>
          </div>
          <div className="rounded-2xl bg-white/60 px-4 py-3">
            <div className="text-xs font-semibold text-ink-600">Submitted</div>
            <div className="mt-1 text-2xl font-extrabold text-ink-900">{examId ? summary.submitted : '—'}</div>
          </div>
          <div className="rounded-2xl bg-white/60 px-4 py-3">
            <div className="text-xs font-semibold text-ink-600">Present</div>
            <div className="mt-1 text-2xl font-extrabold text-ink-900">{examId ? summary.present : '—'}</div>
          </div>
          <div className="rounded-2xl bg-white/60 px-4 py-3">
            <div className="text-xs font-semibold text-ink-600">Absent</div>
            <div className="mt-1 text-2xl font-extrabold text-ink-900">{examId ? summary.absent : '—'}</div>
          </div>
        </div>

        <div className="mt-4">
          <Input label="Search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or email…" />
        </div>
      </Card>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-4">
          <div className="text-sm font-extrabold text-ink-900">Rows</div>
          <div className="mt-1 text-xs text-ink-500">Polling every 5s (only after an exam is selected)</div>

          {!examId ? (
            <div className="mt-4 rounded-2xl bg-white/60 px-4 py-6 text-sm text-ink-600">Select an exam first.</div>
          ) : isLoading ? (
            <div className="mt-4 space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/60" />
              ))}
            </div>
          ) : error ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error.message}</div>
          ) : rows.length ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/60">
              <div className="grid grid-cols-12 bg-white/50 px-4 py-3 text-xs font-semibold text-ink-600">
                <div className="col-span-5">User</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Violations</div>
                <div className="col-span-3 text-right">Last activity</div>
              </div>

              <div className="divide-y divide-white/60 bg-white/40">
                {rows.map((r, idx) => {
                  const s = statusChip(r.status);
                  return (
                    <motion.div
                      key={r.user?.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(0.2, idx * 0.01) }}
                      className="grid grid-cols-12 items-center px-4 py-3"
                    >
                      <div className="col-span-5 min-w-0">
                        <div className="truncate text-sm font-extrabold text-ink-900">{r.user?.name || 'User'}</div>
                        <div className="truncate text-xs text-ink-500">{r.user?.email || '—'}</div>
                      </div>
                      <div className="col-span-2">
                        <div className={`inline-flex rounded-2xl px-3 py-1 text-[11px] font-extrabold shadow-soft ${s.cls}`}>{s.label}</div>
                      </div>
                      <div className="col-span-2 text-xs font-semibold text-ink-700">{r.violationsCount ?? 0}</div>
                      <div className="col-span-3 text-right text-xs text-ink-600">{fmt(r.lastActivityAt)}</div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl bg-white/60 px-4 py-6 text-sm text-ink-600">No rows match this search.</div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
