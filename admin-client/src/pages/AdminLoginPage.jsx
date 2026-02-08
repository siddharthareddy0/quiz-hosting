import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { adminAuthApi } from '../services/adminAuthApi.js';

function validateEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { setSession } = useAdminAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const errors = useMemo(() => {
    const e = {};
    if (!validateEmail(form.email)) e.email = 'Enter a valid email';
    if (!form.password) e.password = 'Password is required';
    return e;
  }, [form]);

  async function onSubmit(e) {
    e.preventDefault();
    setServerError('');
    setTouched({ email: true, password: true });
    if (Object.keys(errors).length) return;

    setLoading(true);
    try {
      const result = await adminAuthApi.login(form.email, form.password);
      setSession(result.token, result.admin);
      navigate('/admin', { replace: true });
    } catch (err) {
      setServerError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-admin-radial">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Card className="p-7">
            <div className="text-xs font-semibold text-ink-600">Admin Authentication</div>
            <div className="mt-2 text-2xl font-extrabold text-ink-900">Sign in to Admin Panel</div>
            <div className="mt-2 text-sm text-ink-600">Enterprise-grade controls for exams, users, and integrity.</div>

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                error={touched.email ? errors.email : ''}
                placeholder="admin@example.com"
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

              <Button className="w-full" size="lg" disabled={loading}>
                {loading ? 'Signing in…' : 'Login'}
              </Button>
            </form>

            <div className="mt-5 text-xs text-ink-500">
              Tip: If you haven’t created an admin yet, enable bootstrap on the server and call the bootstrap endpoint.
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
