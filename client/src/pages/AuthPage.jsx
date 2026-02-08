import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';

function validateEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const navigate = useNavigate();
  const { setSession, isAuthed, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && isAuthed) {
      navigate('/app', { replace: true });
    }
  }, [authLoading, isAuthed, navigate]);

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [touched, setTouched] = useState({});
  const [serverError, setServerError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const errors = useMemo(() => {
    const e = {};
    if (!validateEmail(form.email)) e.email = 'Enter a valid email';
    if (!form.password || form.password.length < 6) e.password = 'Minimum 6 characters';
    if (mode === 'register' && !form.name.trim()) e.name = 'Name is required';
    return e;
  }, [form, mode]);

  async function onSubmit(ev) {
    ev.preventDefault();
    setServerError('');
    setTouched({ name: true, email: true, password: true });
    if (Object.keys(errors).length) return;

    setFormLoading(true);
    try {
      const { authApi } = await import('../services/authApi.js');
      const result =
        mode === 'login'
          ? await authApi.login(form.email, form.password)
          : await authApi.register({ name: form.name, email: form.email, password: form.password });

      setSession(result.token, result.user);
      navigate('/app', { replace: true });
    } catch (e) {
      setServerError(e.message || 'Something went wrong');
    } finally {
      setFormLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-stretch">
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55 }}
        className="relative overflow-hidden rounded-xl2 border border-white/70 bg-white/60 shadow-soft backdrop-blur-xl"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/12 via-transparent to-fuchsia-500/12" />
        <div className="relative flex h-full flex-col justify-between p-8">
          <div>
            <div className="text-xs font-semibold text-ink-600">User Login</div>
            <div className="mt-2 text-3xl font-extrabold tracking-tight text-ink-900">
              Focus-first exams.
            </div>
            <div className="mt-3 max-w-md text-sm leading-relaxed text-ink-600">
              Clean interface, secure pre-checks, and smooth analytics—designed to feel calm during the exam.
            </div>
          </div>

          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="mt-10 rounded-[28px] border border-white/70 bg-white/65 p-6 shadow-soft backdrop-blur-xl"
          >
            <div className="grid grid-cols-2 gap-4">
              {[{ t: 'Fullscreen', s: 'Enforced' }, { t: 'Camera', s: 'Permission' }, { t: 'Auto Save', s: 'Enabled' }, { t: 'Review', s: 'After submit' }].map(
                (x) => (
                  <div key={x.t} className="rounded-2xl bg-gradient-to-br from-blue-600/10 to-fuchsia-600/5 p-4">
                    <div className="text-xs font-semibold text-ink-900">{x.t}</div>
                    <div className="mt-1 text-[11px] text-ink-500">{x.s}</div>
                  </div>
                )
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55 }}
        className="flex items-center"
      >
        <Card className="w-full p-7">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-extrabold text-ink-900">
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </div>
              <div className="mt-1 text-xs text-ink-500">
                {mode === 'login' ? 'Login to continue to your dashboard' : 'Register to access scheduled tests'}
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setServerError('');
                setTouched({});
                setMode((m) => (m === 'login' ? 'register' : 'login'));
              }}
            >
              {mode === 'login' ? 'Register' : 'Login'}
            </Button>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <AnimatePresence mode="popLayout">
              {mode === 'register' ? (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                >
                  <Input
                    label="Full Name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                    error={touched.name ? errors.name : ''}
                    placeholder="Your name"
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>

            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              error={touched.email ? errors.email : ''}
              placeholder="you@example.com"
            />

            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              error={touched.password ? errors.password : ''}
              placeholder="••••••••"
            />

            <AnimatePresence>
              {serverError ? (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                >
                  {serverError}
                </motion.div>
              ) : null}
            </AnimatePresence>

            <Button className="w-full" size="lg" disabled={formLoading}>
              {formLoading ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create account'}
            </Button>

            <Button className="w-full" variant="subtle" size="lg" type="button">
              Continue with Google
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-ink-500">
            By continuing, you agree to the Terms and Privacy Policy.
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
