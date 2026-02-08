import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Save, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { adminAssignmentsApi } from '../services/adminAssignmentsApi.js';
import { adminExamsApi } from '../services/adminExamsApi.js';
import { adminUsersApi } from '../services/adminUsersApi.js';

export default function AdminUsersAssignmentsPage() {
  const { token } = useAdminAuth();
  const qc = useQueryClient();

  const [examId, setExamId] = useState('');
  const [mode, setMode] = useState('all');
  const [selected, setSelected] = useState(() => new Set());
  const [q, setQ] = useState('');
  const [confirmAll, setConfirmAll] = useState(false);

  const { data: examsData, isLoading: examsLoading } = useQuery({
    queryKey: ['admin-exams-min-assign'],
    queryFn: () => adminExamsApi.list(token),
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', q],
    queryFn: () => adminUsersApi.list(token, { q, limit: 80 }),
  });

  const { data: assignData, isLoading: assignLoading } = useQuery({
    queryKey: ['admin-assign', examId],
    queryFn: () => adminAssignmentsApi.get(token, examId),
    enabled: Boolean(examId),
  });

  const exams = examsData?.exams || [];
  const users = usersData?.users || [];

  useMemo(() => {
    if (!assignData?.exam) return;
    setMode(assignData.exam.assignmentMode || 'all');
    setSelected(new Set((assignData.exam.assignedUserIds || []).map((x) => x.toString())));
  }, [assignData]);

  const saveMut = useMutation({
    mutationFn: () =>
      adminAssignmentsApi.update(token, examId, {
        assignmentMode: mode,
        assignedUserIds: Array.from(selected),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-assign', examId] });
    },
  });

  const selectedCount = selected.size;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-ink-600">Users / Assignments</div>
          <div className="mt-1 text-2xl font-extrabold text-ink-900">Assign users to exams</div>
          <div className="mt-1 text-sm text-ink-600">Choose an exam, then assign all users or selected users.</div>
        </div>

        <Button
          onClick={() => saveMut.mutate()}
          disabled={!examId || saveMut.isPending}
          title={!examId ? 'Select an exam first' : 'Save assignments'}
        >
          <Save className="h-4 w-4" />
          {saveMut.isPending ? 'Saving…' : 'Save'}
        </Button>
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
              <option value="">{examsLoading ? 'Loading…' : 'Choose an exam'}</option>
              {exams.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.title}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-2xl border border-white/70 bg-white/60 px-4 py-3">
            <div className="text-xs font-semibold text-ink-600">Selected users</div>
            <div className="mt-1 text-xl font-extrabold text-ink-900">{examId ? selectedCount : '—'}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/60 px-4 py-3">
            <div>
              <div className="text-sm font-extrabold text-ink-900">Assign to all users</div>
              <div className="text-xs text-ink-500">Everyone can see and attempt this exam</div>
            </div>
            <input
              type="radio"
              name="mode"
              checked={mode === 'all'}
              onChange={() => {
                if (mode !== 'all' && selectedCount > 0) setConfirmAll(true);
                else setMode('all');
              }}
              className="h-5 w-5"
              disabled={!examId}
            />
          </label>

          <label className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/60 px-4 py-3">
            <div>
              <div className="text-sm font-extrabold text-ink-900">Assign selected users</div>
              <div className="text-xs text-ink-500">Only selected users can see this exam</div>
            </div>
            <input
              type="radio"
              name="mode"
              checked={mode === 'selected'}
              onChange={() => setMode('selected')}
              className="h-5 w-5"
              disabled={!examId}
            />
          </label>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-extrabold text-ink-900">User list</div>
            <div className="mt-1 text-xs text-ink-500">Search and select users (only used when mode = selected)</div>
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search users (name/email)…"
            className="w-full rounded-2xl border border-ink-100 bg-white/70 px-4 py-2 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100 sm:w-[320px]"
          />
        </div>

        {!examId ? (
          <div className="mt-4 rounded-2xl bg-white/60 px-4 py-6 text-sm text-ink-600">
            Select an exam first.
          </div>
        ) : assignLoading || usersLoading ? (
          <div className="mt-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/60" />
            ))}
          </div>
        ) : users.length ? (
          <div className="mt-4 space-y-2">
            <AnimatePresence>
              {users.map((u, idx) => {
                const isChecked = selected.has(u._id);
                return (
                  <motion.label
                    key={u._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.25, delay: Math.min(0.15, idx * 0.01) }}
                    className={
                      'flex cursor-pointer items-center justify-between gap-4 rounded-2xl border px-4 py-3 transition ' +
                      (isChecked
                        ? 'border-blue-200 bg-blue-50 shadow-soft'
                        : 'border-white/60 bg-white/55 hover:bg-white/75')
                    }
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-blue-600/15 to-violet-600/10">
                        <Users className="h-4 w-4 text-ink-900" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold text-ink-900">{u.name || 'User'}</div>
                        <div className="truncate text-xs text-ink-500">{u.email}</div>
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={isChecked}
                      disabled={mode !== 'selected'}
                      onChange={(e) => {
                        if (mode !== 'selected') return;
                        const checked = e.target.checked;
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (checked) next.add(u._id);
                          else next.delete(u._id);
                          return next;
                        });
                      }}
                    />
                  </motion.label>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-white/60 px-4 py-6 text-sm text-ink-600">
            No users found.
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={confirmAll}
        title="Switch to All Users?"
        message="Selected users will be cleared (exam will be visible to everyone)."
        confirmText="Switch"
        onCancel={() => setConfirmAll(false)}
        onConfirm={() => {
          setSelected(new Set());
          setMode('all');
          setConfirmAll(false);
        }}
      />
    </div>
  );
}
