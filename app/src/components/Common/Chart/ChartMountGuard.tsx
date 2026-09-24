import { ReactNode, useEffect, useState } from 'react';

export function ChartMountGuard({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setReady(true));

    return () => {
      cancelAnimationFrame(frameId);
      setReady(false);
    };
  }, []);

  if (!ready) {
    return null;
  }

  return <>{children}</>;
}
