import { motion } from 'framer-motion';
import { BarChart3, Clock, Medal, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function FloatingPill({ icon: Icon, title, subtitle, className, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className={
        'pointer-events-none absolute rounded-2xl border border-white/70 bg-white/70 px-4 py-3 shadow-soft backdrop-blur-xl ' +
        className
      }
    >
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-blue-600/15 to-fuchsia-600/10">
          <Icon className="h-5 w-5 text-ink-800" />
        </div>
        <div className="leading-tight">
          <div className="text-xs font-semibold text-ink-900">{title}</div>
          <div className="text-[11px] text-ink-500">{subtitle}</div>
        </div>
      </div>
    </motion.div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthed } = useAuth();

  return (
    <div>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
        <div className="order-2 lg:order-1">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-balance text-4xl font-extrabold tracking-tight text-ink-900 md:text-5xl"
          >
            A premium exam experience built for fairness and focus.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-4 text-pretty text-base leading-relaxed text-ink-600"
          >
            Secure, scheduled quizzes with real-time ranking, clean analytics, and a distraction-free exam
            environment.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-7 flex flex-wrap items-center gap-3"
          >
            <Button size="lg" onClick={() => navigate(isAuthed ? '/app' : '/auth')}>
              {isAuthed ? 'Go to Dashboard' : 'Get Started'}
            </Button>
            <Button size="lg" variant="subtle" onClick={() => navigate(isAuthed ? '/app' : '/auth')}>
              {isAuthed ? 'Open Tests' : 'Login'}
            </Button>
          </motion.div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[{ t: 'Fullscreen + Camera', s: 'Proctored checks' }, { t: 'Auto Save', s: 'No lost answers' }, { t: 'Analytics', s: 'Clear trends' }].map(
              (x, idx) => (
                <motion.div
                  key={x.t}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: idx * 0.06 }}
                  className="rounded-xl2 border border-white/70 bg-white/65 px-4 py-4 shadow-soft backdrop-blur-xl"
                >
                  <div className="text-sm font-semibold text-ink-900">{x.t}</div>
                  <div className="mt-1 text-xs text-ink-500">{x.s}</div>
                </motion.div>
              )
            )}
          </div>
        </div>

        <div className="relative order-1 lg:order-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto aspect-square w-full max-w-[520px]"
          >
            <img
              src="/image.png"
              alt="Hero"
              className="absolute inset-0 h-full w-full rounded-[36px] object-cover shadow-lift"
              draggable={false}
            />
          </motion.div>
        </div>
      </div>

      <div className="mt-16">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="text-2xl font-extrabold text-ink-900"
        >
          Built for fair exams and meaningful insight
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-600"
        >
          Give candidates a calm, professional exam environment with real-time compliance checks, automatic
          saving, and post-test analytics.
        </motion.p>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[{ t: 'Fair & Scheduled', s: 'Tests run only within the scheduled window.' }, { t: 'Real-time Ranking', s: 'Leaderboard available when enabled.' }, { t: 'Actionable Analytics', s: 'Track accuracy and trend over time.' }].map(
            (x, idx) => (
              <motion.div
                key={x.t}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
              >
                <Card className="p-5 hover:shadow-lift transition">
                  <div className="text-sm font-semibold text-ink-900">{x.t}</div>
                  <div className="mt-1 text-sm text-ink-600">{x.s}</div>
                </Card>
              </motion.div>
            )
          )}
        </div>
      </div>

      <div className="mt-16 border-t border-white/60 pt-8">
        <div className="flex flex-col gap-3 text-sm text-ink-600 sm:flex-row sm:items-center sm:justify-between">
          <div>© {new Date().getFullYear()} Quiz Hosting</div>
          <div className="flex flex-wrap gap-4">
            <a className="hover:text-ink-900" href="#">
              About
            </a>
            <a className="hover:text-ink-900" href="#">
              Contact
            </a>
            <a className="hover:text-ink-900" href="#">
              Privacy Policy
            </a>
            <a className="hover:text-ink-900" href="#">
              Terms
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
