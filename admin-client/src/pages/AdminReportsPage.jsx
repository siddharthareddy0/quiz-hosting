import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Download, FileSpreadsheet, ScrollText } from 'lucide-react';
import { useMemo, useState } from 'react';

import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { adminAttendanceApi } from '../services/adminAttendanceApi.js';
import { adminExamsApi } from '../services/adminExamsApi.js';
import { adminMalpracticeApi } from '../services/adminMalpracticeApi.js';
import { adminResultsApi } from '../services/adminResultsApi.js';

function safeName(s) {
  return String(s || '')
    .replaceAll(/[^a-z0-9-_ ]/gi, '')
    .trim()
    .slice(0, 80);
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

function toCsv(header, rows) {
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    if (/[\n\r,\"]/g.test(s)) return `"${s.replaceAll('"', '""')}"`;
    return s;
  };

  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(r.map(escape).join(','));
  }
  return lines.join('\n');
}

export default function AdminReportsPage() {
  const { token } = useAdminAuth();

  const [examId, setExamId] = useState('');
  const [q, setQ] = useState('');

  const { data: examsData } = useQuery({
    queryKey: ['admin-exams-reports'],
    queryFn: () => adminExamsApi.list(token),
  });

  const exams = examsData?.exams || [];

  const selectedExam = useMemo(() => {
    return exams.find((e) => e._id === examId) || null;
  }, [exams, examId]);

  const { data: resultsData, isFetching: resultsFetching } = useQuery({
    queryKey: ['admin-reports-results', examId, q],
    queryFn: () => adminResultsApi.examResults(token, examId, { q, limit: 500 }),
    enabled: Boolean(examId),
  });

  const { data: attendanceData, isFetching: attendanceFetching } = useQuery({
    queryKey: ['admin-reports-attendance', examId, q],
    queryFn: () => adminAttendanceApi.rows(token, { examId, q, limit: 1000 }),
    enabled: Boolean(examId),
  });

  const { data: malpracticeData, isFetching: malpracticeFetching } = useQuery({
    queryKey: ['admin-reports-malpractice', examId, q],
    queryFn: () => adminMalpracticeApi.listCases(token, { examId, q, riskMin: 0, limit: 500 }),
    enabled: Boolean(examId),
  });

  const title = safeName(selectedExam?.title || 'report');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-ink-600">Reports</div>
          <div className="mt-1 flex items-center gap-2 text-2xl font-extrabold text-ink-900">
            <FileSpreadsheet className="h-6 w-6" />
            Reports & Exports
          </div>
          <div className="mt-1 text-sm text-ink-600">Export exam data as CSV (results, attendance, malpractice).</div>
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
            <div className="text-xs font-semibold text-ink-600">Ready</div>
            <div className="mt-1 text-sm font-extrabold text-ink-900">{examId ? 'Yes' : 'Select an exam'}</div>
            <div className="mt-1 text-[11px] text-ink-500">Exports run in-browser using admin APIs.</div>
          </div>
        </div>

        <div className="mt-4">
          <Input label="Search (optional)" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or email…" />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold text-ink-900">Results CSV</div>
                <div className="mt-1 text-xs text-ink-500">Leaderboard-ready table (rank, score, percent).</div>
              </div>
              <ScrollText className="h-5 w-5 text-ink-700" />
            </div>

            <div className="mt-4 text-xs text-ink-600">
              Rows: {resultsData?.rows?.length ?? (examId ? '—' : '0')}
            </div>

            <div className="mt-4">
              <Button
                className="w-full"
                disabled={!examId || resultsFetching || !(resultsData?.rows || []).length}
                onClick={() => {
                  const rows = resultsData?.rows || [];
                  const csv = toCsv(
                    ['rank', 'name', 'email', 'score', 'maxScore', 'percent', 'timeTakenSeconds', 'violationsCount', 'malpracticeStatus', 'submittedAt'],
                    rows.map((r) => [
                      r.rank,
                      r.user?.name || '',
                      r.user?.email || '',
                      r.score,
                      r.maxScore,
                      r.percent,
                      r.timeTakenSeconds,
                      r.violationsCount ?? 0,
                      r.malpracticeStatus || '',
                      r.submittedAt ? new Date(r.submittedAt).toISOString() : '',
                    ])
                  );
                  downloadText(`${title}-results.csv`, csv, 'text/csv;charset=utf-8');
                }}
              >
                <Download className="h-4 w-4" />
                Export Results
              </Button>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold text-ink-900">Attendance CSV</div>
                <div className="mt-1 text-xs text-ink-500">Present / absent based on attempts.</div>
              </div>
              <UsersIcon />
            </div>

            <div className="mt-4 text-xs text-ink-600">
              Rows: {attendanceData?.rows?.length ?? (examId ? '—' : '0')}
            </div>

            <div className="mt-4">
              <Button
                className="w-full"
                disabled={!examId || attendanceFetching || !(attendanceData?.rows || []).length}
                onClick={() => {
                  const rows = attendanceData?.rows || [];
                  const csv = toCsv(
                    ['name', 'email', 'status', 'startedAt', 'submittedAt', 'violationsCount', 'malpracticeStatus'],
                    rows.map((r) => [
                      r.user?.name || '',
                      r.user?.email || '',
                      r.status || '',
                      r.startedAt ? new Date(r.startedAt).toISOString() : '',
                      r.submittedAt ? new Date(r.submittedAt).toISOString() : '',
                      r.violationsCount ?? 0,
                      r.malpracticeStatus || '',
                    ])
                  );
                  downloadText(`${title}-attendance.csv`, csv, 'text/csv;charset=utf-8');
                }}
              >
                <Download className="h-4 w-4" />
                Export Attendance
              </Button>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold text-ink-900">Malpractice CSV</div>
                <div className="mt-1 text-xs text-ink-500">Violation timeline summary + decision.</div>
              </div>
              <ShieldIcon />
            </div>

            <div className="mt-4 text-xs text-ink-600">
              Cases: {malpracticeData?.cases?.length ?? (examId ? '—' : '0')}
            </div>

            <div className="mt-4">
              <Button
                className="w-full"
                disabled={!examId || malpracticeFetching || !(malpracticeData?.cases || []).length}
                onClick={() => {
                  const cases = malpracticeData?.cases || [];
                  const csv = toCsv(
                    ['name', 'email', 'exam', 'riskScore', 'violationsCount', 'status', 'decisionAt', 'note', 'lastViolationType', 'lastViolationAt'],
                    cases.map((c) => [
                      c.user?.name || '',
                      c.user?.email || '',
                      c.exam?.title || '',
                      c.riskScore ?? 0,
                      c.violationsCount ?? 0,
                      c.malpracticeStatus || '',
                      c.decisionAt ? new Date(c.decisionAt).toISOString() : '',
                      c.decisionNote || '',
                      c.lastViolation?.type || '',
                      c.lastViolation?.at ? new Date(c.lastViolation.at).toISOString() : '',
                    ])
                  );
                  downloadText(`${title}-malpractice.csv`, csv, 'text/csv;charset=utf-8');
                }}
              >
                <Download className="h-4 w-4" />
                Export Malpractice
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function UsersIcon() {
  return <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-blue-600/15 to-violet-600/10 text-ink-900">U</div>;
}

function ShieldIcon() {
  return <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-rose-600/10 to-amber-600/10 text-ink-900">S</div>;
}
