import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import Button from '../ui/Button.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function PublicNavbar() {
  const navigate = useNavigate();
  const { isAuthed } = useAuth();

  return (
    <div className="sticky top-0 z-40 border-b border-white/60 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500/90 to-fuchsia-500/80 shadow-soft"
          />
          <div className="leading-tight">
            <div className="text-sm font-semibold text-ink-900 cursor-pointer" onClick={() => navigate('/')}>Quiz Hosting</div>
            <div className="text-xs text-ink-500">Secure exams for serious outcomes</div>
          </div>
        </div>

        <Button onClick={() => navigate(isAuthed ? '/app' : '/auth')} variant="primary">
          {isAuthed ? 'Dashboard' : 'Get Started'}
        </Button>
      </div>
    </div>
  );
}
