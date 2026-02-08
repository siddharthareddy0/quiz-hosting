import { AnimatePresence, motion } from 'framer-motion';

import Button from './Button.jsx';

export default function ConfirmDialog({ open, title, message, confirmText = 'Confirm', danger, onCancel, onConfirm }) {
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
            onClick={onCancel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-md overflow-hidden rounded-xl2 border border-white/60 bg-white/80 shadow-lift backdrop-blur-xl"
          >
            <div className="border-b border-white/60 px-6 py-4">
              <div className="text-sm font-extrabold text-ink-900">{title}</div>
              {message ? <div className="mt-1 text-sm text-ink-600">{message}</div> : null}
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4">
              <Button variant="subtle" onClick={onCancel}>
                Cancel
              </Button>
              <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
                {confirmText}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
