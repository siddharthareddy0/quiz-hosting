import { useMutation, useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { attemptsApi } from '../services/attemptsApi.js';
import { testsApi } from '../services/testsApi.js';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

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

  const { data: sessionData, refetch: refetchSession } = useQuery({
    queryKey: ['exam-session', testId],
    queryFn: () => attemptsApi.sessionStatus(token, testId),
    staleTime: 2_000,
  });

  const test = testData?.test;

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [violations, setViolations] = useState([]);
  const [examExitCount, setExamExitCount] = useState(0);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryLeft, setRecoveryLeft] = useState(0);
  const [lastExitTimestamp, setLastExitTimestamp] = useState(null);
  const [isInRecovery, setIsInRecovery] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);

  const startedAtRef = useRef(null);
  const submittingRef = useRef(false);
  const lastSavedFingerprintRef = useRef('');
  const recoveryIntervalRef = useRef(null);
  const debounceSaveRef = useRef(null);
  const lastExitEventAtRef = useRef(0);
  const loadExitCountedRef = useRef(false);
  const baselineViewportDiffRef = useRef({ w: null, h: null });
  const hasEnteredFullscreenRef = useRef(false);

  useEffect(() => {
    if (!sessionData?.session) return;

    const s = sessionData.session;
    setAnswers(s.answers || []);
    setViolations(s.violations || []);
    setIdx(typeof s.currentQuestionIndex === 'number' ? s.currentQuestionIndex : 0);
    setExamExitCount(typeof s.examExitCount === 'number' ? s.examExitCount : 0);
    setLastExitTimestamp(s.lastExitTimestamp ? new Date(s.lastExitTimestamp).toISOString() : null);
    setIsInRecovery(Boolean(s.isInRecovery));
    setRemaining(typeof s.remainingTime === 'number' ? s.remainingTime : null);
    startedAtRef.current = s.startTime ? new Date(s.startTime).getTime() : null;

    if (startedAtRef.current && document.fullscreenElement) {
      hasEnteredFullscreenRef.current = true;
    }

    if (startedAtRef.current && baselineViewportDiffRef.current.w == null) {
      baselineViewportDiffRef.current = {
        w: Math.abs(window.outerWidth - window.innerWidth),
        h: Math.abs(window.outerHeight - window.innerHeight),
      };
    }

    if (s.isSubmitted) {
      navigate(`/app/tests/${testId}/submitted`, { replace: true });
    }
  }, [sessionData, navigate, testId]);

  const durationSeconds = (test?.durationMinutes || 0) * 60;

  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    if (remaining == null) return;
    const id = setInterval(() => {
      setRemaining((s) => (s == null ? s : Math.max(0, s - 1)));
    }, 1000);
    return () => clearInterval(id);
  }, [remaining]);

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
        await refetchSession();
      } finally {
        navigate(`/app/tests/${testId}/submitted`, { replace: true });
      }
    },
    [answers, violations, submitMut, timeTakenSeconds, navigate, testId, refetchSession]
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

  const clearRecovery = useCallback(() => {
    if (recoveryIntervalRef.current) {
      clearInterval(recoveryIntervalRef.current);
      recoveryIntervalRef.current = null;
    }
    setRecoveryOpen(false);
    setRecoveryLeft(0);
    setIsInRecovery(false);
  }, []);

  const beginRecovery = useCallback(
    (reason) => {
      if (!startedAtRef.current) return;
      if (document.fullscreenElement) return;
      if (recoveryIntervalRef.current) return;

      const GRACE_SECONDS = 10;
      setRecoveryOpen(true);
      setRecoveryLeft(GRACE_SECONDS);
      setIsInRecovery(true);

      recoveryIntervalRef.current = setInterval(() => {
        setRecoveryLeft((s) => {
          const next = s - 1;
          if (next <= 0) {
            clearRecovery();
            if (!document.fullscreenElement) {
              submitNow(reason);
            }
            return 0;
          }
          return next;
        });
      }, 1000);
    },
    [clearRecovery, submitNow]
  );

  const triggerExamExit = useCallback(
    (source, meta = {}) => {
      if (!startedAtRef.current) return;
      if (submittingRef.current) return;

      if (document.fullscreenElement) {
        hasEnteredFullscreenRef.current = true;
      }

      const startRecoverySoon = () => {
        if (document.fullscreenElement) {
          setTimeout(() => {
            if (!document.fullscreenElement) {
              beginRecovery('EXAM_ENVIRONMENT_EXIT');
            }
          }, 150);
          return;
        }
        beginRecovery('EXAM_ENVIRONMENT_EXIT');
      };

      if (!hasEnteredFullscreenRef.current) {
        if (!document.fullscreenElement) {
          startRecoverySoon();
        }
        return;
      }

      if (recoveryIntervalRef.current || isInRecovery || recoveryOpen) {
        if (!document.fullscreenElement) {
          startRecoverySoon();
        }
        return;
      }

      const now = Date.now();
      if (now - lastExitEventAtRef.current < 900) return;
      lastExitEventAtRef.current = now;

      const ts = new Date().toISOString();
      setLastExitTimestamp(ts);
      addViolation('EXAM_ENVIRONMENT_EXIT', { source, ...meta, at: ts });
      setExamExitCount((c) => c + 1);
      startRecoverySoon();
    },
    [addViolation, beginRecovery, isInRecovery, recoveryOpen]
  );

  const requestFullscreen = useCallback(async () => {
    try {
      const el = document.documentElement;
      if (!document.fullscreenElement && el?.requestFullscreen) {
        await el.requestFullscreen();
      }
    } finally {
      if (document.fullscreenElement) {
        hasEnteredFullscreenRef.current = true;
        clearRecovery();
      }
    }
  }, [clearRecovery]);

  useEffect(() => {
    return () => {
      clearRecovery();
    };
  }, [clearRecovery]);

  useEffect(() => {
    if (!test) return;
    const clean = disableUserActions();
    return clean;
  }, [test]);

  useEffect(() => {
    const onFs = () => {
      if (!startedAtRef.current) return;

      if (!document.fullscreenElement) {
        triggerExamExit('fullscreenchange', {});
      } else {
        hasEnteredFullscreenRef.current = true;
        clearRecovery();
      }
    };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, [triggerExamExit, clearRecovery]);

  useEffect(() => {
    if (!sessionData?.session) return;
    if (!startedAtRef.current) return;

    if (isInRecovery && !document.fullscreenElement) {
      beginRecovery('EXAM_ENVIRONMENT_EXIT');
      return;
    }

    const nav = performance.getEntriesByType?.('navigation')?.[0];
    const navType = nav?.type;
    const isReload = navType === 'reload';
    const isBackForward = navType === 'back_forward';

    if (!loadExitCountedRef.current && (isReload || isBackForward)) {
      loadExitCountedRef.current = true;
      triggerExamExit('navigation', { navType });
      return;
    }

    if (!document.fullscreenElement) {
      beginRecovery('EXAM_ENVIRONMENT_EXIT');
    }
  }, [sessionData, isInRecovery, beginRecovery, triggerExamExit]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible') {
        triggerExamExit('visibilitychange', { visibilityState: document.visibilityState });
      }
    };
    const onBlur = () => triggerExamExit('blur', {});
    const onKey = (e) => {
      if (!startedAtRef.current) return;
      if (submittingRef.current) return;

      const key = e.key?.toLowerCase();
      const isF12 = e.key === 'F12' || key === 'f12';
      const isCtrlShiftI = e.ctrlKey && e.shiftKey && key === 'i';
      const isCtrlShiftJ = e.ctrlKey && e.shiftKey && key === 'j';
      const isCtrlShiftC = e.ctrlKey && e.shiftKey && key === 'c';
      const isReload = (e.ctrlKey || e.metaKey) && key === 'r';
      const isF5 = e.key === 'F5' || key === 'f5';

      if (isF12 || isCtrlShiftI || isCtrlShiftJ || isCtrlShiftC) {
        triggerExamExit('devtools_shortcut', { key: e.key, code: e.code });
      }

      if (isReload || isF5) {
        triggerExamExit('reload_shortcut', { key: e.key, code: e.code });
      }
    };

    const THRESH = 160;
    const checkDevtools = (source) => {
      if (!startedAtRef.current) return;
      if (submittingRef.current) return;

      const base = baselineViewportDiffRef.current;
      if (base.w == null || base.h == null) return;

      const wDiff = Math.abs(window.outerWidth - window.innerWidth);
      const hDiff = Math.abs(window.outerHeight - window.innerHeight);
      const wIncr = wDiff - base.w;
      const hIncr = hDiff - base.h;
      if (wIncr > THRESH || hIncr > THRESH) {
        triggerExamExit('devtools_resize', {
          source,
          wDiff,
          hDiff,
          baseWDiff: base.w,
          baseHDiff: base.h,
          wIncr,
          hIncr,
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          outerWidth: window.outerWidth,
          outerHeight: window.outerHeight,
        });
      }
    };
    const onResize = () => checkDevtools('resize');

    const onOffline = () => triggerExamExit('offline', {});

    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onResize);
    window.addEventListener('offline', onOffline);
    const devtoolsId = setInterval(() => checkDevtools('interval'), 800);

    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('offline', onOffline);
      clearInterval(devtoolsId);
    };
  }, [triggerExamExit]);

  useEffect(() => {
    if (!startedAtRef.current) return;
    if (remaining != null && remaining <= 0 && durationSeconds > 0) {
      submitNow('TIME_EXPIRED');
    }
  }, [remaining, durationSeconds, submitNow]);

  const getFp = useCallback(() => {
    const key = 'qh_device_fingerprint';
    return localStorage.getItem(key) || '';
  }, []);

  const persistNow = useCallback(
    (payload) => {
      if (!token) return;
      const url = `${API_BASE}/api/attempts/${testId}/progress`;
      const body = JSON.stringify(payload);

      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
        return;
      }

      fetch(url, {
        method: 'PUT',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(payload?.deviceFingerprint ? { 'x-device-fingerprint': payload.deviceFingerprint } : {}),
        },
        body,
      }).catch(() => {});
    },
    [token, testId]
  );

  useEffect(() => {
    const fp = getFp();
    const handler = () => {
      persistNow({
        answers,
        violations,
        currentQuestionIndex: idx,
        examExitCount,
        lastExitTimestamp,
        isInRecovery,
        deviceFingerprint: fp,
      });
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [persistNow, getFp, answers, violations, idx, examExitCount, lastExitTimestamp, isInRecovery]);

  useEffect(() => {
    if (!sessionData?.session) return;
    if (!test?.questions?.length) return;

    if (debounceSaveRef.current) clearTimeout(debounceSaveRef.current);
    debounceSaveRef.current = setTimeout(() => {
      if (saveMut.isPending) return;
      saveMut.mutate({
        answers,
        violations,
        currentQuestionIndex: idx,
        examExitCount,
        lastExitTimestamp,
        isInRecovery,
        deviceFingerprint: getFp(),
      });
    }, 350);

    return () => {
      if (debounceSaveRef.current) {
        clearTimeout(debounceSaveRef.current);
        debounceSaveRef.current = null;
      }
    };
  }, [sessionData, test, answers, violations, idx, examExitCount, lastExitTimestamp, isInRecovery, saveMut, getFp]);

  useEffect(() => {
    if (examExitCount > 5) {
      submitNow('EXAM_EXIT_LIMIT');
    }
  }, [examExitCount, submitNow]);

  useEffect(() => {
    if (!test?.questions?.length || !answers.length) return;
    const id = setInterval(() => {
      if (saveMut.isPending) return;
      const fingerprint = JSON.stringify({
        answers,
        violations,
        currentQuestionIndex: idx,
        examExitCount,
        lastExitTimestamp,
        isInRecovery,
      });
      if (fingerprint === lastSavedFingerprintRef.current) return;
      lastSavedFingerprintRef.current = fingerprint;
      saveMut.mutate({
        answers,
        violations,
        currentQuestionIndex: idx,
        examExitCount,
        lastExitTimestamp,
        isInRecovery,
      });
    }, 6000);
    return () => clearInterval(id);
  }, [test, answers, violations, idx, examExitCount, lastExitTimestamp, isInRecovery, saveMut]);

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

  if (!test || !sessionData?.session) {
    return <Card className="h-[360px] animate-pulse bg-white/60" />;
  }

  return (
    <div className="relative grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
      {recoveryOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 px-4">
          <Card className="w-full max-w-md p-5">
            <div className="text-base font-extrabold text-ink-900">You exited the exam environment</div>
            <div className="mt-2 text-sm font-semibold text-ink-600">
              Please return to fullscreen within{' '}
              <span className="font-extrabold text-rose-700">{recoveryLeft}s</span> or your test will be auto-submitted.
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

          <div className="mt-4 text-[11px] text-ink-500">Exits: {examExitCount}/5</div>
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
