import { AnimatePresence, motion } from 'framer-motion';

export default function Modal({ open, title, children, onClose, footer }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/30"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-3xl overflow-hidden rounded-xl2 border border-white/60 bg-white/80 shadow-lift backdrop-blur-xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/60 px-6 py-4">
              <div>
                <div className="text-xs font-semibold text-ink-600">{title}</div>
              </div>
              <button
                className="rounded-2xl bg-white/70 px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-white"
                onClick={onClose}
              >
                Close
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto px-6 py-5">{children}</div>
            {footer ? <div className="border-t border-white/60 px-6 py-4">{footer}</div> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
