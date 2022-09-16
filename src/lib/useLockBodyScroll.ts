import { useEffect } from "react";

export default function useLockBodyScroll(
  isVisible: boolean,
  opts: {
    disableLock?: boolean,
  } = {}
) {
  useEffect(() => {
    if (opts.disableLock) {
      return;
    }

    if (isVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    }
  }, [opts.disableLock, isVisible]);
}
