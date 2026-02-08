import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { adminExamsApi } from '../services/adminExamsApi.js';

function toIsoLocal(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const iso = new Date(`${dateStr}T${timeStr}:00`).toISOString();
  return iso;
}

function fromIso(iso) {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  const date = d.toISOString().slice(0, 10);
  const time = d.toTimeString().slice(0, 5);
  return { date, time };
}

const steps = [
  { id: 1, title: 'Basics' },
  { id: 2, title: 'Schedule' },
  { id: 3, title: 'Marks' },
  { id: 4, title: 'Visibility' },
];

export default function AdminExamWizardPage() {
  const { token } = useAdminAuth();
  const { examId } = useParams();
  const editMode = Boolean(examId);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [step, setStep] = useState(1);

  const { data: examData } = useQuery({
    queryKey: ['admin-exam', examId],
    queryFn: () => adminExamsApi.get(token, examId),
    enabled: editMode,
  });

  const initial = useMemo(() => {
    const e = examData?.exam;
    if (!e) {
      return {
        title: '',
        description: '',
        instructions: '',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        durationMinutes: 30,
        lateEntryBlocked: false,
        totalMarks: 0,
        passingMarks: 0,
        negativeMarkingEnabled: false,
        negativeMarkPerQuestion: 0,
        leaderboardEnabled: true,
        leaderboardVisible: true,
        answerKeyVisible: true,
        published: false,
      };
    }

    const s = fromIso(e.startAt);
    const en = fromIso(e.endAt);

    return {
      title: e.title || '',
      description: e.description || '',
      instructions: e.instructions || '',
      startDate: s.date,
      startTime: s.time,
      endDate: en.date,
      endTime: en.time,
      durationMinutes: e.durationMinutes || 30,
      lateEntryBlocked: Boolean(e.lateEntryBlocked),
      totalMarks: e.totalMarks ?? 0,
      passingMarks: e.passingMarks ?? 0,
      negativeMarkingEnabled: Boolean(e.negativeMarkingEnabled),
      negativeMarkPerQuestion: e.negativeMarkPerQuestion ?? 0,
      leaderboardEnabled: Boolean(e.leaderboardEnabled),
      leaderboardVisible: e.leaderboardVisible ?? true,
      answerKeyVisible: e.answerKeyVisible ?? true,
      published: Boolean(e.published),
    };
  }, [examData]);

  const [form, setForm] = useState(initial);

  if (editMode && examData?.exam && form.title === '' && initial.title) {
    setForm(initial);
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      const startAt = toIsoLocal(form.startDate, form.startTime);
      const endAt = toIsoLocal(form.endDate, form.endTime);

      const payload = {
        title: form.title,
        description: form.description,
        instructions: form.instructions,
        startAt,
        endAt,
        durationMinutes: Number(form.durationMinutes),
        lateEntryBlocked: Boolean(form.lateEntryBlocked),
        totalMarks: Number(form.totalMarks),
        passingMarks: Number(form.passingMarks),
        negativeMarkingEnabled: Boolean(form.negativeMarkingEnabled),
        negativeMarkPerQuestion: Number(form.negativeMarkPerQuestion),
        leaderboardEnabled: Boolean(form.leaderboardEnabled),
        leaderboardVisible: Boolean(form.leaderboardVisible),
        answerKeyVisible: Boolean(form.answerKeyVisible),
        published: Boolean(form.published),
      };

      if (editMode) {
        return adminExamsApi.update(token, examId, payload);
      }
      return adminExamsApi.create(token, payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-exams'] });
      await qc.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      navigate('/admin/exams');
    },
  });

  const canNext = useMemo(() => {
    if (step === 1) return form.title.trim().length > 2;
    if (step === 2) return Boolean(form.startDate && form.startTime && form.endDate && form.endTime);
    return true;
  }, [step, form]);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-ink-600">{editMode ? 'Edit Exam' : 'Create Exam'}</div>
          <div className="mt-1 text-2xl font-extrabold text-ink-900">Step {step}: {steps[step - 1].title}</div>
        </div>
        <Button variant="subtle" onClick={() => navigate('/admin/exams')}>
          Back
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {steps.map((s) => (
          <button
            key={s.id}
            onClick={() => setStep(s.id)}
            className={
              'rounded-2xl border px-4 py-3 text-left text-sm font-extrabold transition ' +
              (step === s.id
                ? 'border-blue-200 bg-blue-50 shadow-soft'
                : 'border-white/70 bg-white/60 hover:bg-white/80')
            }
          >
            <div className="text-[11px] font-semibold text-ink-600">STEP {s.id}</div>
            <div className="mt-1 text-ink-900">{s.title}</div>
          </button>
        ))}
      </div>

      <Card className="p-6">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div key="s1" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <div className="grid grid-cols-1 gap-4">
                <Input
                  label="Exam title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Weekly Assessment - Algebra"
                />
                <label className="block">
                  <div className="mb-1.5 text-xs font-semibold text-ink-700">Description</div>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="min-h-24 w-full rounded-2xl border border-ink-100 bg-white/70 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                    placeholder="Short summary shown on user dashboard"
                  />
                </label>
                <label className="block">
                  <div className="mb-1.5 text-xs font-semibold text-ink-700">Instructions</div>
                  <textarea
                    value={form.instructions}
                    onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
                    className="min-h-28 w-full rounded-2xl border border-ink-100 bg-white/70 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                    placeholder="Displayed to users before the exam starts"
                  />
                </label>
              </div>
            </motion.div>
          ) : null}

          {step === 2 ? (
            <motion.div key="s2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Start date"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                />
                <Input
                  label="Start time"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                />
                <Input
                  label="End date"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                />
                <Input
                  label="End time"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                />
                <Input
                  label="Duration (minutes)"
                  type="number"
                  value={form.durationMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
                />

                <label className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/60 px-4 py-3">
                  <div>
                    <div className="text-sm font-extrabold text-ink-900">Late entry block</div>
                    <div className="text-xs text-ink-500">Block users from starting after start time</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.lateEntryBlocked}
                    onChange={(e) => setForm((f) => ({ ...f, lateEntryBlocked: e.target.checked }))}
                    className="h-5 w-5"
                  />
                </label>
              </div>
            </motion.div>
          ) : null}

          {step === 3 ? (
            <motion.div key="s3" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Total marks"
                  type="number"
                  value={form.totalMarks}
                  onChange={(e) => setForm((f) => ({ ...f, totalMarks: e.target.value }))}
                />
                <Input
                  label="Passing marks"
                  type="number"
                  value={form.passingMarks}
                  onChange={(e) => setForm((f) => ({ ...f, passingMarks: e.target.value }))}
                />

                <label className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/60 px-4 py-3 md:col-span-2">
                  <div>
                    <div className="text-sm font-extrabold text-ink-900">Negative marking</div>
                    <div className="text-xs text-ink-500">Apply penalty for wrong answers</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.negativeMarkingEnabled}
                    onChange={(e) => setForm((f) => ({ ...f, negativeMarkingEnabled: e.target.checked }))}
                    className="h-5 w-5"
                  />
                </label>

                {form.negativeMarkingEnabled ? (
                  <div className="md:col-span-2">
                    <Input
                      label="Negative mark per question"
                      type="number"
                      value={form.negativeMarkPerQuestion}
                      onChange={(e) => setForm((f) => ({ ...f, negativeMarkPerQuestion: e.target.value }))}
                    />
                  </div>
                ) : null}
              </div>
            </motion.div>
          ) : null}

          {step === 4 ? (
            <motion.div key="s4" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <div className="grid grid-cols-1 gap-4">
                <label className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/60 px-4 py-3">
                  <div>
                    <div className="text-sm font-extrabold text-ink-900">Leaderboard visibility</div>
                    <div className="text-xs text-ink-500">Enable leaderboard feature for this exam</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.leaderboardEnabled}
                    onChange={(e) => setForm((f) => ({ ...f, leaderboardEnabled: e.target.checked }))}
                    className="h-5 w-5"
                  />
                </label>

                <label className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/60 px-4 py-3">
                  <div>
                    <div className="text-sm font-extrabold text-ink-900">Show leaderboard to users</div>
                    <div className="text-xs text-ink-500">Publish/hide leaderboard after exam</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.leaderboardVisible}
                    onChange={(e) => setForm((f) => ({ ...f, leaderboardVisible: e.target.checked }))}
                    className="h-5 w-5"
                  />
                </label>

                <label className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/60 px-4 py-3">
                  <div>
                    <div className="text-sm font-extrabold text-ink-900">Answer key visibility</div>
                    <div className="text-xs text-ink-500">Allow users to view answer key after submission</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.answerKeyVisible}
                    onChange={(e) => setForm((f) => ({ ...f, answerKeyVisible: e.target.checked }))}
                    className="h-5 w-5"
                  />
                </label>

                <label className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/60 px-4 py-3">
                  <div>
                    <div className="text-sm font-extrabold text-ink-900">Publish exam now</div>
                    <div className="text-xs text-ink-500">If off, exam stays hidden from users</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
                    className="h-5 w-5"
                  />
                </label>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="subtle"
              disabled={step === 1}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              disabled={!canNext || step === 4}
              onClick={() => setStep((s) => Math.min(4, s + 1))}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="primary"
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
          >
            <Save className="h-4 w-4" />
            {saveMut.isPending ? 'Saving…' : editMode ? 'Save Changes' : 'Create Exam'}
          </Button>
        </div>
      </Card>

      <div className="text-xs text-ink-500">
        Rule: Exam is not visible to users until published. Access is allowed only within scheduled time.
      </div>
    </div>
  );
}
