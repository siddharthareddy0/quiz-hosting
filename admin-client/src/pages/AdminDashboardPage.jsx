import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { adminDashboardApi } from '../services/adminDashboardApi.js';
import Card from '../components/ui/Card.jsx';
import { useCountUp } from '../hooks/useCountUp.js';

function Stat({ label, value, delay = 0 }) {
  const n = useCountUp(value, { durationMs: 900 });
  const display = Number.isInteger(value) ? Math.round(n) : Math.round(n * 100) / 100;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay }}>
      <Card className="p-6 transition hover:-translate-y-0.5 hover:shadow-lift">
        <div className="text-xs font-semibold text-ink-600">{label}</div>
        <div className="mt-2 text-3xl font-extrabold text-ink-900">{display}</div>
      </Card>
    </motion.div>
  );
}

export default function AdminDashboardPage() {
  const { token } = useAdminAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: () => adminDashboardApi.stats(token),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="h-[120px] animate-pulse bg-white/60" />
        ))}
        <Card className="h-[340px] animate-pulse bg-white/60 md:col-span-2" />
        <Card className="h-[340px] animate-pulse bg-white/60" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-sm font-semibold text-ink-900">Failed to load admin dashboard</div>
        <div className="mt-1 text-sm text-ink-600">{error.message}</div>
      </Card>
    );
  }

  const s = data.stats;

  const chart = [
    { name: 'Upcoming', value: s.upcomingExams },
    { name: 'Active', value: s.activeExams },
    { name: 'Completed', value: s.completedExams },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-ink-600">Overview</div>
          <div className="mt-1 text-2xl font-extrabold text-ink-900">Admin Dashboard</div>
        </div>
        <div className="rounded-2xl bg-white/70 px-4 py-2 text-xs font-semibold text-ink-700 shadow-soft">
          Data-rich monitoring
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat label="Total Exams" value={s.totalExams} />
        <Stat label="Upcoming Exams" value={s.upcomingExams} delay={0.03} />
        <Stat label="Active Exams" value={s.activeExams} delay={0.06} />
        <Stat label="Completed Exams" value={s.completedExams} delay={0.09} />
        <Stat label="Registered Users" value={s.totalUsers} delay={0.12} />
        <Stat label="Avg Score / Exam" value={s.avgScorePerExam} delay={0.15} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2">
          <Card className="p-6">
            <div className="text-sm font-extrabold text-ink-900">Exam States</div>
            <div className="mt-1 text-xs text-ink-500">Upcoming vs Active vs Completed</div>

            <div className="mt-5 h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#2563EB" fill="rgba(37,99,235,0.18)" strokeWidth={3} isAnimationActive />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="p-6">
            <div className="text-sm font-extrabold text-ink-900">Recent Activity</div>
            <div className="mt-1 text-xs text-ink-500">Latest admin actions</div>

            <div className="mt-4 space-y-2">
              {(data.recentActivity || []).length ? (
                (data.recentActivity || []).map((a) => (
                  <div key={a.id} className="rounded-2xl bg-white/60 px-4 py-3">
                    <div className="text-xs font-semibold text-ink-900">{a.message}</div>
                    <div className="mt-1 text-[11px] text-ink-500">
                      {a.admin?.name || 'Admin'} • {new Date(a.at).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-white/60 px-4 py-4 text-sm text-ink-600">
                  No activity yet.
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
