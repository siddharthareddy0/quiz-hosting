import { motion } from 'framer-motion';

export default function FullPageLoader() {
  return (
    <div className="min-h-screen bg-admin-radial">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="rounded-xl2 border border-white/70 bg-white/70 px-8 py-6 shadow-soft backdrop-blur-xl"
        >
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 animate-pulse rounded-full bg-blue-600" />
            <div className="text-sm font-semibold text-ink-800">Loading Admin…</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
