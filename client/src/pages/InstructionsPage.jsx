import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { testsApi } from '../services/testsApi.js';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';

export default function InstructionsPage() {
  const { testId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['test', testId],
    queryFn: () => testsApi.get(token, testId),
  });

  const state = useMemo(() => {
    const t = data?.test;
    if (!t) return { canStart: false, message: '' };
    const now = Date.now();
    const start = new Date(t.startAt).getTime();
    const end = new Date(t.endAt).getTime();
    if (now < start) return { canStart: false, message: 'Exam not started yet' };
    if (now > end) return { canStart: false, message: 'Exam window ended' };
    return { canStart: true, message: '' };
  }, [data]);

  if (isLoading) {
    return <Card className="h-[240px] animate-pulse bg-white/60" />;
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-sm font-semibold text-ink-900">Failed to load instructions</div>
        <div className="mt-1 text-sm text-ink-600">{error.message}</div>
      </Card>
    );
  }

  const test = data?.test;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2">
        <Card className="p-6">
          <div className="text-sm font-extrabold text-ink-900">{test.title}</div>
          <div className="mt-1 text-sm text-ink-600">{test.description || 'Read the rules carefully before entering the exam.'}</div>

          <div className="mt-6 space-y-3 text-sm text-ink-700">
            {[
              'You must stay in fullscreen mode during the exam.',
              'Camera permission is required to continue.',
              'Right-click, copy/paste, and text selection are disabled during the attempt.',
              'If you exit fullscreen twice, the exam will be auto-submitted.',
              'Switching tabs repeatedly may trigger auto-submission.',
              'Answers are auto-saved as you progress.',
            ].map((x) => (
              <div key={x} className="rounded-2xl bg-white/60 px-4 py-3">
                {x}
              </div>
            ))}
          </div>

          {state.message ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              {state.message}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button variant="subtle" onClick={() => navigate('/app')}>
              Back
            </Button>
            <Button disabled={!state.canStart} onClick={() => navigate(`/app/tests/${testId}/security`)}>
              Start Exam
            </Button>
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="p-6">
          <div className="text-xs font-semibold text-ink-600">Exam Window</div>
          <div className="mt-2 text-sm font-semibold text-ink-900">Starts</div>
          <div className="text-sm text-ink-600">{new Date(test.startAt).toLocaleString()}</div>
          <div className="mt-3 text-sm font-semibold text-ink-900">Ends</div>
          <div className="text-sm text-ink-600">{new Date(test.endAt).toLocaleString()}</div>
          <div className="mt-3 text-sm font-semibold text-ink-900">Duration</div>
          <div className="text-sm text-ink-600">{test.durationMinutes} minutes</div>
        </Card>
      </motion.div>
    </div>
  );
}
