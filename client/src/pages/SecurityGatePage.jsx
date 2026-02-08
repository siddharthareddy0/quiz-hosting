import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { attemptsApi } from '../services/attemptsApi.js';
import { testsApi } from '../services/testsApi.js';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';

async function requestCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  stream.getTracks().forEach((t) => t.stop());
  return true;
}

async function enterFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement) {
    await el.requestFullscreen();
  }
}

export default function SecurityGatePage() {
  const { testId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [cameraOk, setCameraOk] = useState(false);
  const [fsOk, setFsOk] = useState(Boolean(document.fullscreenElement));
  const [err, setErr] = useState('');

  const { data: testData } = useQuery({
    queryKey: ['test-exam-meta', testId],
    queryFn: () => testsApi.get(token, testId),
  });

  const canStart = useMemo(() => {
    const t = testData?.test;
    if (!t) return false;
    const now = Date.now();
    return now >= new Date(t.startAt).getTime() && now <= new Date(t.endAt).getTime();
  }, [testData]);

  useEffect(() => {
    const onFs = () => setFsOk(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const startMut = useMutation({
    mutationFn: () => attemptsApi.start(token, testId),
  });

  async function handleFullscreen() {
    setErr('');
    try {
      await enterFullscreen();
      setFsOk(Boolean(document.fullscreenElement));
    } catch (e) {
      setErr('Fullscreen permission is required');
    }
  }

  async function handleCamera() {
    setErr('');
    try {
      await requestCamera();
      setCameraOk(true);
    } catch (e) {
      setErr('Camera permission is required');
      setCameraOk(false);
    }
  }

  async function handleContinue() {
    setErr('');
    if (!canStart) {
      setErr('Exam not available right now');
      return;
    }
    if (!fsOk || !cameraOk) {
      setErr('Complete fullscreen and camera checks to continue');
      return;
    }
    try {
      await startMut.mutateAsync();
      navigate(`/app/tests/${testId}/exam`, { replace: true });
    } catch (e) {
      setErr(e.message || 'Unable to start');
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Card className="p-6">
        <div className="text-sm font-extrabold text-ink-900">Security Check</div>
        <div className="mt-1 text-sm text-ink-600">Complete these steps before entering the exam.</div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="rounded-xl2 border border-white/70 bg-white/60 p-5 shadow-soft">
              <div className="text-sm font-semibold text-ink-900">Fullscreen mode</div>
              <div className="mt-1 text-xs text-ink-500">Required during the exam</div>
              <div className="mt-4 flex items-center justify-between">
                <div className={fsOk ? 'text-xs font-bold text-emerald-700' : 'text-xs font-bold text-ink-600'}>
                  {fsOk ? 'Enabled' : 'Not enabled'}
                </div>
                <Button size="sm" onClick={handleFullscreen}>
                  Enable
                </Button>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <div className="rounded-xl2 border border-white/70 bg-white/60 p-5 shadow-soft">
              <div className="text-sm font-semibold text-ink-900">Camera permission</div>
              <div className="mt-1 text-xs text-ink-500">Used for verification</div>
              <div className="mt-4 flex items-center justify-between">
                <div
                  className={cameraOk ? 'text-xs font-bold text-emerald-700' : 'text-xs font-bold text-ink-600'}
                >
                  {cameraOk ? 'Granted' : 'Not granted'}
                </div>
                <Button size="sm" onClick={handleCamera}>
                  Allow
                </Button>
              </div>
            </div>
          </motion.div>
        </div>

        {err ? (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {err}
          </motion.div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button variant="subtle" onClick={() => navigate(`/app/tests/${testId}/instructions`)}>
            Back
          </Button>
          <Button disabled={startMut.isPending} onClick={handleContinue}>
            {startMut.isPending ? 'Starting…' : 'Continue to Exam'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
