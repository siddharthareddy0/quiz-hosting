import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { testsApi } from '../services/testsApi.js';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';

function fmtDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function TestCard({ test, onOpen, badge }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className="group p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-extrabold text-ink-900">{test.title}</div>
              {badge ? (
                <div
                  title={test.myRank ? `Rank #${test.myRank}` : 'Top 5'}
                  className="rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 px-3 py-1 text-[11px] font-bold text-amber-700"
                >
                  TOP 5
                </div>
              ) : null}
            </div>
            <div className="mt-1 text-xs text-ink-500">{test.description || 'Scheduled assessment'}</div>
          </div>
          <div className="rounded-2xl bg-white/80 px-3 py-1 text-xs font-semibold text-ink-700 shadow-soft">
            {test.status.toUpperCase()}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-ink-600">
          <div className="rounded-2xl bg-white/60 px-3 py-3">
            <div className="font-semibold text-ink-800">Starts</div>
            <div className="mt-1">{fmtDateTime(test.startAt)}</div>
          </div>
          <div className="rounded-2xl bg-white/60 px-3 py-3">
            <div className="font-semibold text-ink-800">Duration</div>
            <div className="mt-1">{test.durationMinutes} min</div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-ink-500">
            {test.attempted ? `Attempted • ${test.score}/${test.maxScore}` : 'Not attempted'}
          </div>
          <Button size="sm" onClick={onOpen}>
            Open
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['tests'],
    queryFn: () => testsApi.list(token),
  });

  const { upcoming, attempted } = useMemo(() => {
    const tests = data?.tests || [];
    return {
      upcoming: tests.filter((t) => t.status !== 'ended' && !t.attempted),
      attempted: tests.filter((t) => t.attempted),
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="h-[180px] animate-pulse bg-white/60" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-sm font-semibold text-ink-900">Failed to load tests</div>
        <div className="mt-1 text-sm text-ink-600">{error.message}</div>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="text-sm font-extrabold text-ink-900">Upcoming Tests</div>
        <div className="mt-1 text-xs text-ink-500">Open a test to view instructions and schedule.</div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {upcoming.length ? (
            upcoming.map((t) => (
              <TestCard
                key={t.id}
                test={t}
                badge={t.top5}
                onOpen={() => navigate(`/app/tests/${t.id}/instructions`)}
              />
            ))
          ) : (
            <Card className="p-6">
              <div className="text-sm font-semibold text-ink-900">No upcoming tests</div>
              <div className="mt-1 text-sm text-ink-600">When a test is scheduled, it will appear here.</div>
            </Card>
          )}
        </div>
      </div>

      <div>
        <div className="text-sm font-extrabold text-ink-900">Attempted Tests</div>
        <div className="mt-1 text-xs text-ink-500">Review results and answer keys.</div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {attempted.length ? (
            attempted.map((t) => (
              <TestCard
                key={t.id}
                test={t}
                badge={t.top5}
                onOpen={() => navigate(`/app/tests/${t.id}/review`)}
              />
            ))
          ) : (
            <Card className="p-6">
              <div className="text-sm font-semibold text-ink-900">No attempts yet</div>
              <div className="mt-1 text-sm text-ink-600">Your completed tests will show up here.</div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
