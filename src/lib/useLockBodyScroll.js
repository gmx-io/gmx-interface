import { disableBodyScroll, enableBodyScroll, clearAllBodyScrollLocks } from "body-scroll-lock";
import { useEffect } from "react";

export default function useLockBodyScroll(ref, isVisible, disableLock) {
  useEffect(() => {
    if (disableLock) {
      return;
    }

    if (ref.current) {
      isVisible ? disableBodyScroll(ref.current) : enableBodyScroll(ref.current);
    }

    return () => clearAllBodyScrollLocks();
  }, [ref, disableLock, isVisible]);
}
