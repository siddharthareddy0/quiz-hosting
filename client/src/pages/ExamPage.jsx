import { useMutation, useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { attemptsApi } from '../services/attemptsApi.js';
import { testsApi } from '../services/testsApi.js';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';

function disableUserActions() {
  const prevent = (e) => e.preventDefault();
  const preventKeys = (e) => {
    const key = e.key?.toLowerCase();
    if (e.ctrlKey || e.metaKey) {
      if (['c', 'v', 'x', 'a', 's', 'p'].includes(key)) {
        e.preventDefault();
      }
    }
  };

  document.addEventListener('contextmenu', prevent);
  document.addEventListener('copy', prevent);
  document.addEventListener('cut', prevent);
  document.addEventListener('paste', prevent);
  document.addEventListener('selectstart', prevent);
  document.addEventListener('keydown', preventKeys);

  return () => {
    document.removeEventListener('contextmenu', prevent);
    document.removeEventListener('copy', prevent);
    document.removeEventListener('cut', prevent);
    document.removeEventListener('paste', prevent);
    document.removeEventListener('selectstart', prevent);
    document.removeEventListener('keydown', preventKeys);
  };
}

function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function paletteState(answer) {
  if (!answer?.visited) return 'nv';
  if (answer.markedForReview) return 'mr';
  if (answer.selectedOptionId) return 'a';
  return 'vna';
}

const paletteClasses = {
  nv: 'bg-white text-ink-800 border-ink-100',
  vna: 'bg-rose-50 text-rose-700 border-rose-200',
  a: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  mr: 'bg-amber-50 text-amber-800 border-amber-200',
};

export default function ExamPage() {
  const { testId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const { data: testData } = useQuery({
    queryKey: ['test-exam', testId],
    queryFn: () => testsApi.getExam(token, testId),
    staleTime: 30_000,
  });

  const { data: attemptData, refetch: refetchAttempt } = useQuery({
    queryKey: ['attempt', testId],
    queryFn: () => attemptsApi.getOrCreate(token, testId),
    staleTime: 10_000,
  });

  const test = testData?.test;

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [violations, setViolations] = useState([]);
  const [fsExitCount, setFsExitCount] = useState(0);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [fsWarnOpen, setFsWarnOpen] = useState(false);
  const [fsGraceLeft, setFsGraceLeft] = useState(0);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);

  const startedAtRef = useRef(null);
  const submittingRef = useRef(false);
  const lastSavedFingerprintRef = useRef('');
  const fsGraceIntervalRef = useRef(null);

  useEffect(() => {
    if (!attemptData?.attempt) return;
    setAnswers(attemptData.attempt.answers || []);
    setViolations(attemptData.attempt.violations || []);
    startedAtRef.current = attemptData.attempt.startedAt ? new Date(attemptData.attempt.startedAt).getTime() : null;
  }, [attemptData]);

  const durationSeconds = (test?.durationMinutes || 0) * 60;

  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    if (!startedAtRef.current || !durationSeconds) return;
    const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
    setRemaining(Math.max(0, durationSeconds - elapsed));
  }, [durationSeconds]);

  useEffect(() => {
    if (!startedAtRef.current || !durationSeconds) return;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      setRemaining(Math.max(0, durationSeconds - elapsed));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [durationSeconds]);

  const saveMut = useMutation({
    mutationFn: (payload) => attemptsApi.saveProgress(token, testId, payload),
  });

  const submitMut = useMutation({
    mutationFn: (payload) => attemptsApi.submit(token, testId, payload),
  });

  const timeTakenSeconds = useMemo(() => {
    if (!durationSeconds || remaining == null) return 0;
    return Math.max(0, durationSeconds - remaining);
  }, [durationSeconds, remaining]);

  const submitNow = useCallback(
    async (reason) => {
      if (submittingRef.current) return;
      submittingRef.current = true;

      const nextViolations = [
        ...violations,
        {
          type: 'AUTO_SUBMIT',
          at: new Date().toISOString(),
          meta: { reason },
        },
      ];

      setViolations(nextViolations);
      try {
        await submitMut.mutateAsync({
          timeTakenSeconds,
          answers,
          violations: nextViolations,
        });
        await refetchAttempt();
      } finally {
        navigate(`/app/tests/${testId}/submitted`, { replace: true });
      }
    },
    [answers, violations, submitMut, timeTakenSeconds, navigate, testId, refetchAttempt]
  );

  const addViolation = useCallback((type, meta = {}) => {
    setViolations((prev) => [
      ...prev,
      {
        type,
        at: new Date().toISOString(),
        meta,
      },
    ]);
  }, []);

  const clearFullscreenGrace = useCallback(() => {
    if (fsGraceIntervalRef.current) {
      clearInterval(fsGraceIntervalRef.current);
      fsGraceIntervalRef.current = null;
    }
    setFsWarnOpen(false);
    setFsGraceLeft(0);
  }, []);

  const requestFullscreen = useCallback(async () => {
    try {
      const el = document.documentElement;
      if (!document.fullscreenElement && el?.requestFullscreen) {
        await el.requestFullscreen();
      }
    } finally {
      if (document.fullscreenElement) {
        clearFullscreenGrace();
      }
    }
  }, [clearFullscreenGrace]);

  useEffect(() => {
    return () => {
      clearFullscreenGrace();
    };
  }, [clearFullscreenGrace]);

  useEffect(() => {
    if (!test) return;
    const clean = disableUserActions();
    return clean;
  }, [test]);

  useEffect(() => {
    const onFs = () => {
      if (!startedAtRef.current) return;

      if (document.fullscreenElement) {
        clearFullscreenGrace();
        return;
      }

      addViolation('FULLSCREEN_EXIT', {});
      setFsExitCount((c) => c + 1);

      if (fsGraceIntervalRef.current) return;
      const GRACE_SECONDS = 10;
      setFsWarnOpen(true);
      setFsGraceLeft(GRACE_SECONDS);

      fsGraceIntervalRef.current = setInterval(() => {
        setFsGraceLeft((s) => {
          const next = s - 1;
          if (next <= 0) {
            clearFullscreenGrace();
            if (!document.fullscreenElement) {
              submitNow('FULLSCREEN_NOT_RESTORED');
            }
            return 0;
          }
          return next;
        });
      }, 1000);
    };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, [addViolation, clearFullscreenGrace, submitNow]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible') {
        addViolation('TAB_SWITCH', { visibilityState: document.visibilityState });
        setTabSwitchCount((c) => c + 1);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [addViolation]);

  useEffect(() => {
    if (!startedAtRef.current) return;
    if (remaining != null && remaining <= 0 && durationSeconds > 0) {
      submitNow('TIME_EXPIRED');
    }
  }, [remaining, durationSeconds, submitNow]);

  useEffect(() => {
    if (fsExitCount >= 2) {
      submitNow('FULLSCREEN_EXIT_LIMIT');
    }
  }, [fsExitCount, submitNow]);

  useEffect(() => {
    if (tabSwitchCount >= 5) {
      submitNow('TAB_SWITCH_LIMIT');
    }
  }, [tabSwitchCount, submitNow]);

  useEffect(() => {
    if (!test?.questions?.length || !answers.length) return;
    const id = setInterval(() => {
      if (saveMut.isPending) return;
      const fingerprint = JSON.stringify({ answers, violations });
      if (fingerprint === lastSavedFingerprintRef.current) return;
      lastSavedFingerprintRef.current = fingerprint;
      saveMut.mutate({ answers, violations });
    }, 6000);
    return () => clearInterval(id);
  }, [test, answers, violations, saveMut]);

  const q = test?.questions?.[idx];
  const qId = q?.id || q?._id;
  const a = answers.find((x) => x.questionId === qId);

  const unansweredCount = useMemo(() => {
    const total = test?.questions?.length || 0;
    if (!total) return 0;
    const answered = answers.filter((x) => x?.selectedOptionId != null).length;
    return Math.max(0, total - answered);
  }, [test, answers]);

  const upsertAnswer = useCallback(
    (questionId, patcher) => {
      if (!questionId) return;
      setAnswers((prev) => {
        const i = prev.findIndex((x) => x.questionId === questionId);
        if (i === -1) {
          const base = { questionId, visited: true, selectedOptionId: null, markedForReview: false };
          return [...prev, patcher(base)];
        }
        return prev.map((x) => (x.questionId === questionId ? patcher(x) : x));
      });
    },
    [setAnswers]
  );

  const visitCurrent = useCallback(() => {
    if (!qId) return;
    upsertAnswer(qId, (x) => ({ ...x, visited: true }));
  }, [qId, upsertAnswer]);

  useEffect(() => {
    visitCurrent();
  }, [visitCurrent]);

  const setAnswer = (optionId) => {
    if (!qId) return;
    upsertAnswer(qId, (x) => ({ ...x, selectedOptionId: optionId, visited: true }));
  };

  const toggleReview = () => {
    if (!qId) return;
    upsertAnswer(qId, (x) => ({ ...x, markedForReview: !x.markedForReview, visited: true }));
  };

  if (!test || !attemptData?.attempt) {
    return <Card className="h-[360px] animate-pulse bg-white/60" />;
  }

  return (
    <div className="relative grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
      {fsWarnOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 px-4">
          <Card className="w-full max-w-md p-5">
            <div className="text-base font-extrabold text-ink-900">Fullscreen required</div>
            <div className="mt-2 text-sm font-semibold text-ink-600">
              You exited fullscreen. Return within{' '}
              <span className="font-extrabold text-rose-700">{fsGraceLeft}s</span> or your test will be auto-submitted.
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={requestFullscreen}>Enter Fullscreen</Button>
              <Button variant="subtle" onClick={() => submitNow('USER_CONFIRMED_SUBMIT')}>Submit Now</Button>
            </div>
          </Card>
        </div>
      ) : null}

      {submitConfirmOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 px-4">
          <Card className="w-full max-w-md p-5">
            <div className="text-base font-extrabold text-ink-900">Submit test?</div>
            <div className="mt-2 text-sm font-semibold text-ink-600">
              You have{' '}
              <span className="font-extrabold text-rose-700">{unansweredCount}</span>{' '}
              unanswered question{unansweredCount === 1 ? '' : 's'}.
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button variant="subtle" onClick={() => setSubmitConfirmOpen(false)} disabled={submitMut.isPending}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setSubmitConfirmOpen(false);
                  submitNow('USER_SUBMIT');
                }}
                disabled={submitMut.isPending}
              >
                Yes, Submit
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold text-ink-900">{test.title}</div>
            <div className="mt-0.5 text-xs text-ink-500">One question at a time • Auto-save enabled</div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={() => setSubmitConfirmOpen(true)}
              disabled={submitMut.isPending}
            >
              Submit
            </Button>
            <motion.div
              key={remaining}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-white/80 px-4 py-2 text-sm font-extrabold text-ink-900 shadow-soft"
            >
              {remaining == null ? '--:--' : formatTime(remaining)}
            </motion.div>
          </div>
        </div>

        <div className="mt-5 rounded-xl2 border border-white/70 bg-white/60 p-5">
          <div className="text-xs font-semibold text-ink-600">Question {idx + 1} / {test.questions.length}</div>
          <div className="mt-2 text-base font-semibold text-ink-900">{q.prompt}</div>

          <div className="mt-4 grid grid-cols-1 gap-3">
            {q.options.map((opt) => {
              const optId = opt.id || opt._id;
              const selected = a?.selectedOptionId != null && a?.selectedOptionId === optId;
              return (
                <button
                  key={optId}
                  onClick={() => setAnswer(optId)}
                  className={
                    'rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ' +
                    (selected
                      ? 'border-blue-300 bg-blue-50 shadow-soft'
                      : 'border-ink-100 bg-white/80 hover:bg-white')
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-ink-900">{opt.text}</div>
                    {selected ? (
                      <div className="rounded-full bg-blue-600 px-2 py-1 text-[10px] font-extrabold text-white">
                        Selected
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant="subtle" size="sm" disabled={idx === 0} onClick={() => setIdx((v) => Math.max(0, v - 1))}>
                Previous
              </Button>
              <Button size="sm" disabled={idx === test.questions.length - 1} onClick={() => setIdx((v) => Math.min(test.questions.length - 1, v + 1))}>
                Next
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={toggleReview}>
                {a?.markedForReview ? 'Unmark Review' : 'Mark for Review'}
              </Button>
            </div>
          </div>

          <div className="mt-4 text-[11px] text-ink-500">
            Fullscreen exits: {fsExitCount}/2 • Tab switches: {tabSwitchCount}/5
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="text-sm font-extrabold text-ink-900">Questions</div>
        <div className="mt-1 text-xs text-ink-500">Use palette to navigate</div>

        <div className="mt-4 grid grid-cols-5 gap-2">
          {test.questions.map((qq, i) => {
            const qqId = qq?.id || qq?._id;
            const aa = answers.find((x) => x.questionId === qqId);
            const st = paletteState(aa);
            return (
              <button
                key={qqId}
                onClick={() => setIdx(i)}
                className={
                  'grid h-10 w-10 place-items-center rounded-2xl border text-xs font-extrabold transition hover:shadow-soft ' +
                  paletteClasses[st]
                }
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        <div className="mt-5 space-y-2 text-xs text-ink-600">
          <div className="flex items-center justify-between rounded-2xl bg-white/60 px-3 py-2">
            <div>Not visited</div>
            <div className="h-3 w-3 rounded-sm border border-ink-100 bg-white" />
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-white/60 px-3 py-2">
            <div>Visited not answered</div>
            <div className="h-3 w-3 rounded-sm border border-rose-200 bg-rose-50" />
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-white/60 px-3 py-2">
            <div>Answered</div>
            <div className="h-3 w-3 rounded-sm border border-emerald-200 bg-emerald-50" />
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-white/60 px-3 py-2">
            <div>Marked for review</div>
            <div className="h-3 w-3 rounded-sm border border-amber-200 bg-amber-50" />
          </div>
        </div>
      </Card>
    </div>
  );
}
