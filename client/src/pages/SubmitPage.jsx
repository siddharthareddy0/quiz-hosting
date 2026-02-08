import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { attemptsApi } from '../services/attemptsApi.js';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';

export default function SubmitPage() {
  const { testId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['leaderboard', testId],
    queryFn: () => attemptsApi.leaderboard(token, testId),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-7">
          <div className="text-sm font-extrabold text-ink-900">Submitted</div>
          <div className="mt-1 text-sm text-ink-600">Your attempt has been recorded.</div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={() => navigate(`/app/tests/${testId}/review`)}>View Answer Key</Button>
            <Button variant="subtle" onClick={() => navigate('/app')}>
              Back to Dashboard
            </Button>
          </div>
        </Card>
      </motion.div>

      {data?.leaderboardEnabled ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="p-7">
            <div className="text-sm font-extrabold text-ink-900">Leaderboard</div>
            <div className="mt-1 text-xs text-ink-500">Top performers (live ranking)</div>

            <div className="mt-4 space-y-2">
              {(data.items || []).slice(0, 10).map((x) => (
                <div key={x.rank} className="flex items-center justify-between rounded-2xl bg-white/60 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-blue-600/15 to-fuchsia-600/10 text-xs font-extrabold text-ink-900">
                      {x.rank}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-ink-900">{x.user.name}</div>
                      <div className="text-xs text-ink-500">Time: {Math.round(x.timeTakenSeconds / 60)}m</div>
                    </div>
                  </div>
                  <div className="text-sm font-extrabold text-ink-900">
                    {x.score}/{x.maxScore}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      ) : null}
    </div>
  );
}
