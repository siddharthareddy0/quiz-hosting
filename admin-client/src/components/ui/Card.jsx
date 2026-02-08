import clsx from 'clsx';

export default function Card({ className, children }) {
  return (
    <div
      className={clsx(
        'rounded-xl2 border border-white/70 bg-white/70 shadow-soft backdrop-blur-xl',
        className
      )}
    >
      {children}
    </div>
  );
}
