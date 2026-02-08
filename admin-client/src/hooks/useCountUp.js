import { useEffect, useMemo, useState } from 'react';

export function useCountUp(target, { durationMs = 900 } = {}) {
  const [value, setValue] = useState(0);

  const safeTarget = useMemo(() => {
    const n = Number(target);
    return Number.isFinite(n) ? n : 0;
  }, [target]);

  useEffect(() => {
    let raf = null;
    const start = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(safeTarget * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    setValue(0);
    raf = requestAnimationFrame(tick);

    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [safeTarget, durationMs]);

  return value;
}
