import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Eye, Plus, Save, Trash2, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';

import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Modal from '../components/ui/Modal.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { adminExamsApi } from '../services/adminExamsApi.js';
import { adminQuestionsApi } from '../services/adminQuestionsApi.js';

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeParsedRow(r) {
  const questionText = String(r.question || r.prompt || r.Question || r.Prompt || '').trim();
  const A = String(r.A ?? r.a ?? r.optionA ?? r.OptionA ?? '').trim();
  const B = String(r.B ?? r.b ?? r.optionB ?? r.OptionB ?? '').trim();
  const C = String(r.C ?? r.c ?? r.optionC ?? r.OptionC ?? '').trim();
  const D = String(r.D ?? r.d ?? r.optionD ?? r.OptionD ?? '').trim();
  const correct = String(r.correct ?? r.correctAnswer ?? r.Correct ?? r.CorrectAnswer ?? '').trim().toUpperCase();
  const marks = Number(r.marks ?? r.Marks ?? 1);
  const explanation = String(r.explanation ?? r.Explanation ?? '').trim();

  if (!questionText) return null;
  if (![A, B, C, D].every((x) => x)) return null;
  if (!['A', 'B', 'C', 'D'].includes(correct)) return null;

  const correctOptionId = correct;

  return {
    id: uid(),
    prompt: questionText,
    options: [
      { id: 'A', text: A },
      { id: 'B', text: B },
      { id: 'C', text: C },
      { id: 'D', text: D },
    ],
    correctOptionId,
    marks: Number.isFinite(marks) ? marks : 1,
    explanation,
  };
}

export default function AdminQuestionsPage() {
  const { token } = useAdminAuth();
  const qc = useQueryClient();

  const fileRef = useRef(null);

  const [examId, setExamId] = useState('');
  const [openModal, setOpenModal] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const [draft, setDraft] = useState({
    prompt: '',
    A: '',
    B: '',
    C: '',
    D: '',
    correct: 'A',
    marks: 1,
    explanation: '',
  });

  const [editId, setEditId] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, questionId: null });
  const [formError, setFormError] = useState('');

  const { data: examsData, isLoading: examsLoading } = useQuery({
    queryKey: ['admin-exams-min'],
    queryFn: () => adminExamsApi.list(token),
  });

  const { data: qsData, isLoading: qsLoading, error: qsError } = useQuery({
    queryKey: ['admin-questions', examId],
    queryFn: () => adminQuestionsApi.list(token, examId),
    enabled: Boolean(examId),
  });

  const questions = qsData?.questions || [];

  const settingsMut = useMutation({
    mutationFn: (payload) => adminQuestionsApi.settings(token, examId, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-questions', examId] });
    },
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const invalid =
        !draft.prompt.trim() ||
        !draft.A.trim() ||
        !draft.B.trim() ||
        !draft.C.trim() ||
        !draft.D.trim();
      if (invalid) {
        throw new Error('Fill question text and all options (A–D)');
      }

      const payload = {
        prompt: draft.prompt,
        options: [
          { id: 'A', text: draft.A },
          { id: 'B', text: draft.B },
          { id: 'C', text: draft.C },
          { id: 'D', text: draft.D },
        ],
        correctOptionId: draft.correct,
        marks: Number(draft.marks),
        explanation: draft.explanation,
      };

      if (editId) return adminQuestionsApi.update(token, examId, editId, payload);
      return adminQuestionsApi.create(token, examId, payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-questions', examId] });
      setOpenModal(false);
      setEditId(null);
      setFormError('');
    },
    onError: (e) => {
      setFormError(e.message || 'Unable to save');
    },
  });

  const deleteMut = useMutation({
    mutationFn: ({ questionId }) => adminQuestionsApi.remove(token, examId, questionId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-questions', examId] });
    },
  });

  const reorderMut = useMutation({
    mutationFn: (orderedIds) => adminQuestionsApi.reorder(token, examId, orderedIds),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-questions', examId] });
    },
  });

  const bulkMut = useMutation({
    mutationFn: (items) => adminQuestionsApi.bulk(token, examId, items),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-questions', examId] });
      setBulkOpen(false);
      setBulkPreview([]);
    },
  });

  const [bulkPreview, setBulkPreview] = useState([]);

  const examOptions = useMemo(() => examsData?.exams || [], [examsData]);

  const selectedExam = useMemo(
    () => examOptions.find((e) => e._id === examId) || null,
    [examOptions, examId]
  );

  const shuffleQuestions = qsData?.exam?.shuffleQuestions || false;
  const shuffleOptions = qsData?.exam?.shuffleOptions || false;

  const openAdd = () => {
    setEditId(null);
    setDraft({ prompt: '', A: '', B: '', C: '', D: '', correct: 'A', marks: 1, explanation: '' });
    setFormError('');
    setOpenModal(true);
  };

  const openEdit = (q) => {
    setEditId(q.id);
    setFormError('');
    setDraft({
      prompt: q.prompt,
      A: q.options.find((o) => o.id === 'A')?.text || '',
      B: q.options.find((o) => o.id === 'B')?.text || '',
      C: q.options.find((o) => o.id === 'C')?.text || '',
      D: q.options.find((o) => o.id === 'D')?.text || '',
      correct: q.correctOptionId,
      marks: q.marks ?? 1,
      explanation: q.explanation || '',
    });
    setOpenModal(true);
  };

  const [dragId, setDragId] = useState(null);

  const onDrop = (overId) => {
    if (!dragId || dragId === overId) return;
    const ids = questions.map((x) => x.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(overId);
    if (from === -1 || to === -1) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    reorderMut.mutate(ids);
  };

  const parseFile = async (file) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

    const parsed = rows.map(normalizeParsedRow).filter(Boolean);
    setBulkPreview(parsed);
    setBulkOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-ink-600">Questions</div>
          <div className="mt-1 text-2xl font-extrabold text-ink-900">Questions Module</div>
          <div className="mt-1 text-sm text-ink-600">Select an exam and manage its questions.</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="subtle"
            onClick={() => fileRef.current?.click()}
            disabled={!examId}
            title={!examId ? 'Select an exam first' : 'Bulk upload'}
          >
            <Upload className="h-4 w-4" />
            Bulk Upload
          </Button>
          <Button onClick={openAdd} disabled={!examId} title={!examId ? 'Select an exam first' : 'Add question'}>
            <Plus className="h-4 w-4" />
            Add Question
          </Button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) parseFile(f);
          e.target.value = '';
        }}
      />

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
              {examOptions.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.title}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-2xl border border-white/70 bg-white/60 px-4 py-3">
            <div className="text-xs font-semibold text-ink-600">Question count</div>
            <div className="mt-1 text-xl font-extrabold text-ink-900">{examId ? questions.length : '—'}</div>
          </div>
        </div>

        {examId ? (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/60 px-4 py-3">
              <div>
                <div className="text-sm font-extrabold text-ink-900">Shuffle questions</div>
                <div className="text-xs text-ink-500">Randomize order per user</div>
              </div>
              <input
                type="checkbox"
                checked={shuffleQuestions}
                onChange={(e) => settingsMut.mutate({ shuffleQuestions: e.target.checked })}
                className="h-5 w-5"
              />
            </label>

            <label className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/60 px-4 py-3">
              <div>
                <div className="text-sm font-extrabold text-ink-900">Shuffle options</div>
                <div className="text-xs text-ink-500">Randomize options per user</div>
              </div>
              <input
                type="checkbox"
                checked={shuffleOptions}
                onChange={(e) => settingsMut.mutate({ shuffleOptions: e.target.checked })}
                className="h-5 w-5"
              />
            </label>
          </div>
        ) : null}
      </Card>

      <Card className="p-5">
        <div className="text-sm font-extrabold text-ink-900">Questions</div>
        <div className="mt-1 text-xs text-ink-500">Drag to reorder • Hover for actions</div>

        {!examId ? (
          <div className="mt-4 rounded-2xl bg-white/60 px-4 py-6 text-sm text-ink-600">
            Select an exam to view and manage questions.
          </div>
        ) : qsLoading ? (
          <div className="mt-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/60" />
            ))}
          </div>
        ) : qsError ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {qsError.message}
          </div>
        ) : questions.length ? (
          <div className="mt-4 space-y-2">
            {questions.map((q, idx) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(0.2, idx * 0.015) }}
                draggable
                onDragStart={() => setDragId(q.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(q.id)}
                className="group rounded-2xl border border-white/60 bg-white/55 px-4 py-4 shadow-soft transition hover:shadow-lift"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-ink-600">#{idx + 1} • Marks: {q.marks ?? 1}</div>
                    <div className="mt-1 truncate text-sm font-extrabold text-ink-900">{q.prompt}</div>
                    <div className="mt-1 text-xs text-ink-500">Correct: {q.correctOptionId}</div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
                    <Button size="sm" variant="subtle" onClick={() => { setDraft({
                      prompt: q.prompt,
                      A: q.options.find((o) => o.id === 'A')?.text || '',
                      B: q.options.find((o) => o.id === 'B')?.text || '',
                      C: q.options.find((o) => o.id === 'C')?.text || '',
                      D: q.options.find((o) => o.id === 'D')?.text || '',
                      correct: q.correctOptionId,
                      marks: q.marks ?? 1,
                      explanation: q.explanation || '',
                    }); setPreviewOpen(true); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(q)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        setConfirm({ open: true, questionId: q.id });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-white/60 px-4 py-7 text-center">
            <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600/15 to-violet-600/10" />
            <div className="text-sm font-extrabold text-ink-900">No questions yet</div>
            <div className="mt-1 text-sm text-ink-600">Add a question or upload a sheet to begin.</div>
          </div>
        )}
      </Card>

      <Modal
        open={openModal}
        title={editId ? 'Edit Question' : 'Add Question'}
        onClose={() => { setOpenModal(false); setEditId(null); }}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="subtle" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-4 w-4" />
              Preview
            </Button>
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              <Save className="h-4 w-4" />
              {saveMut.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4">
          <label className="block">
            <div className="mb-1.5 text-xs font-semibold text-ink-700">Question text</div>
            <textarea
              value={draft.prompt}
              onChange={(e) => setDraft((d) => ({ ...d, prompt: e.target.value }))}
              className="min-h-24 w-full rounded-2xl border border-ink-100 bg-white/70 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input label="Option A" value={draft.A} onChange={(e) => setDraft((d) => ({ ...d, A: e.target.value }))} />
            <Input label="Option B" value={draft.B} onChange={(e) => setDraft((d) => ({ ...d, B: e.target.value }))} />
            <Input label="Option C" value={draft.C} onChange={(e) => setDraft((d) => ({ ...d, C: e.target.value }))} />
            <Input label="Option D" value={draft.D} onChange={(e) => setDraft((d) => ({ ...d, D: e.target.value }))} />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="block">
              <div className="mb-1.5 text-xs font-semibold text-ink-700">Correct answer</div>
              <select
                value={draft.correct}
                onChange={(e) => setDraft((d) => ({ ...d, correct: e.target.value }))}
                className="w-full rounded-2xl border border-ink-100 bg-white/70 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              >
                {['A', 'B', 'C', 'D'].map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Marks"
              type="number"
              value={draft.marks}
              onChange={(e) => setDraft((d) => ({ ...d, marks: e.target.value }))}
            />
          </div>

          <label className="block">
            <div className="mb-1.5 text-xs font-semibold text-ink-700">Explanation (optional)</div>
            <textarea
              value={draft.explanation}
              onChange={(e) => setDraft((d) => ({ ...d, explanation: e.target.value }))}
              className="min-h-20 w-full rounded-2xl border border-ink-100 bg-white/70 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
          </label>

          {formError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {formError}
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={previewOpen}
        title="Question Preview"
        onClose={() => setPreviewOpen(false)}
        footer={<Button variant="subtle" onClick={() => setPreviewOpen(false)}>Close Preview</Button>}
      >
        <div className="rounded-xl2 border border-white/60 bg-white/60 p-5">
          <div className="text-xs font-semibold text-ink-600">{selectedExam?.title || 'Exam'}</div>
          <div className="mt-2 text-sm font-extrabold text-ink-900">{draft.prompt || '—'}</div>
          <div className="mt-4 space-y-2">
            {['A', 'B', 'C', 'D'].map((k) => (
              <div key={k} className={
                'rounded-2xl border px-4 py-3 text-sm ' +
                (draft.correct === k ? 'border-emerald-200 bg-emerald-50' : 'border-ink-100 bg-white/70')
              }>
                <div className="font-semibold text-ink-900">{k}. {draft[k] || '—'}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs text-ink-500">Marks: {draft.marks}</div>
          {draft.explanation ? (
            <div className="mt-4 rounded-2xl bg-white/70 px-4 py-3 text-sm text-ink-700">{draft.explanation}</div>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={bulkOpen}
        title="Bulk Upload Preview"
        onClose={() => setBulkOpen(false)}
        footer={
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-semibold text-ink-600">Parsed: {bulkPreview.length} questions</div>
            <Button onClick={() => bulkMut.mutate(bulkPreview)} disabled={bulkMut.isPending || bulkPreview.length === 0}>
              <Save className="h-4 w-4" />
              {bulkMut.isPending ? 'Saving…' : 'Confirm & Save'}
            </Button>
          </div>
        }
      >
        {bulkPreview.length ? (
          <div className="space-y-2">
            {bulkPreview.slice(0, 30).map((q, idx) => (
              <div key={q.id} className="rounded-2xl border border-white/60 bg-white/55 px-4 py-3">
                <div className="text-xs font-semibold text-ink-600">#{idx + 1} • Correct: {q.correctOptionId} • Marks: {q.marks}</div>
                <div className="mt-1 text-sm font-extrabold text-ink-900">{q.prompt}</div>
              </div>
            ))}
            {bulkPreview.length > 30 ? (
              <div className="text-xs text-ink-500">Showing first 30 for preview.</div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-2xl bg-white/60 px-4 py-4 text-sm text-ink-600">
            No valid questions detected. Ensure columns: question, A, B, C, D, correct, marks (optional), explanation (optional).
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirm.open}
        title="Delete question?"
        message="This cannot be undone."
        confirmText="Delete"
        danger
        onCancel={() => setConfirm({ open: false, questionId: null })}
        onConfirm={() => {
          deleteMut.mutate({ questionId: confirm.questionId });
          setConfirm({ open: false, questionId: null });
        }}
      />
    </div>
  );
}
