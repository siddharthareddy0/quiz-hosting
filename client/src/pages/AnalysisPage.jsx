import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { useAuth } from '../context/AuthContext.jsx';
import { analysisApi } from '../services/analysisApi.js';
import Card from '../components/ui/Card.jsx';

export default function AnalysisPage() {
  const { token } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['analysis'],
    queryFn: () => analysisApi.me(token),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="h-[140px] animate-pulse bg-white/60" />
        ))}
        <Card className="h-[360px] animate-pulse bg-white/60 md:col-span-3" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-sm font-semibold text-ink-900">Failed to load analysis</div>
        <div className="mt-1 text-sm text-ink-600">{error.message}</div>
      </Card>
    );
  }

  const trend = (data?.trend || []).map((t, i) => ({
    name: t.label.length > 10 ? `Test ${i + 1}` : t.label,
    accuracy: t.accuracy,
    score: t.score,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[{ label: 'Attempted', value: data.stats.attemptedCount }, { label: 'Avg Accuracy', value: `${data.stats.avgAccuracy}%` }, { label: 'Consistency', value: trend.length ? 'Tracking' : '—' }].map(
          (x, idx) => (
            <motion.div key={x.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: idx * 0.05 }}>
              <Card className="p-6">
                <div className="text-xs font-semibold text-ink-600">{x.label}</div>
                <div className="mt-2 text-3xl font-extrabold text-ink-900">{x.value}</div>
              </Card>
            </motion.div>
          )
        )}
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <Card className="p-6">
          <div className="text-sm font-extrabold text-ink-900">Accuracy Trend</div>
          <div className="mt-1 text-xs text-ink-500">Animated score overview across attempts</div>

          <div className="mt-5 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#2563EB"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                  isAnimationActive
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
