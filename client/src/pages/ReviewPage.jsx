import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { attemptsApi } from '../services/attemptsApi.js';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';

export default function ReviewPage() {
  const { testId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['review', testId],
    queryFn: () => attemptsApi.review(token, testId),
  });

  const answersByQ = useMemo(() => {
    const map = new Map();
    for (const a of data?.attempt?.answers || []) map.set(a.questionId, a);
    return map;
  }, [data]);

  const correctByQ = useMemo(() => {
    const map = new Map();
    for (const c of data?.correct || []) map.set(c.questionId, c);
    return map;
  }, [data]);

  if (isLoading) return <Card className="h-[320px] animate-pulse bg-white/60" />;
  if (error) {
    return (
      <Card className="p-6">
        <div className="text-sm font-semibold text-ink-900">Unable to load review</div>
        <div className="mt-1 text-sm text-ink-600">{error.message}</div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold text-ink-900">{data.test.title}</div>
            <div className="mt-1 text-xs text-ink-500">
              Score: {data.attempt.score}/{data.attempt.maxScore}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="subtle" onClick={() => navigate('/app')}>
              Dashboard
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {data.test.questions.map((q, idx) => {
          const a = answersByQ.get(q.id);
          const c = correctByQ.get(q.id);
          return (
            <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: Math.min(0.25, idx * 0.03) }}>
              <Card className="p-6">
                <div className="text-xs font-semibold text-ink-600">Question {idx + 1}</div>
                <div className="mt-2 text-sm font-semibold text-ink-900">{q.prompt}</div>

                <div className="mt-4 grid grid-cols-1 gap-2">
                  {q.options.map((opt) => {
                    const isCorrect = opt.id === c.correctOptionId;
                    const isSelected = opt.id === a?.selectedOptionId;
                    const cls = isCorrect
                      ? 'border-emerald-200 bg-emerald-50'
                      : isSelected
                        ? 'border-rose-200 bg-rose-50'
                        : 'border-ink-100 bg-white/70';

                    return (
                      <div key={opt.id} className={`rounded-2xl border px-4 py-3 text-sm ${cls}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-semibold text-ink-900">{opt.text}</div>
                          <div className="text-[11px] font-extrabold">
                            {isCorrect ? <span className="text-emerald-700">Correct</span> : null}
                            {!isCorrect && isSelected ? <span className="text-rose-700">Your pick</span> : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {c.explanation ? (
                  <div className="mt-4 rounded-2xl bg-white/60 px-4 py-3 text-sm text-ink-700">
                    {c.explanation}
                  </div>
                ) : null}
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
