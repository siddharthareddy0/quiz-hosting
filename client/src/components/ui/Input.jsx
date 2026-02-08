import clsx from 'clsx';

export default function Input({ label, error, className, ...props }) {
  return (
    <label className="block">
      {label ? <div className="mb-1.5 text-xs font-semibold text-ink-700">{label}</div> : null}
      <input
        className={clsx(
          'w-full rounded-2xl border bg-white/80 px-4 py-3 text-sm outline-none transition',
          error
            ? 'border-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100'
            : 'border-ink-100 focus:border-blue-300 focus:ring-4 focus:ring-blue-100',
          className
        )}
        {...props}
      />
      {error ? <div className="mt-1 text-xs font-medium text-rose-600">{error}</div> : null}
    </label>
  );
}
