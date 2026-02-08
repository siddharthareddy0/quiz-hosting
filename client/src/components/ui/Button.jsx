import clsx from 'clsx';

export default function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  disabled,
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60';

  const variants = {
    primary:
      'bg-gradient-to-br from-blue-600 to-fuchsia-600 text-white shadow-soft hover:shadow-lift',
    ghost: 'bg-transparent text-ink-700 hover:bg-white/70 hover:text-ink-900',
    subtle: 'bg-white/80 text-ink-900 shadow-soft hover:shadow-lift',
    danger: 'bg-gradient-to-br from-rose-600 to-orange-600 text-white shadow-soft hover:shadow-lift',
  };

  const sizes = {
    md: 'px-5 py-3 text-sm',
    sm: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3.5 text-base',
  };

  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
