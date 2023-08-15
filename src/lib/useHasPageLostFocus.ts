import { isDevelopment } from "config/env";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import useIsWindowVisible from "./useIsWindowFocused";

export function useHasPageLostFocus(lostFocusTimeout: number, whiteListedPages?: string[], debugId?: string) {
  const isWindowFocused = useIsWindowVisible();

  const location = useLocation();

  const isPageFocused = whiteListedPages?.length ? whiteListedPages.includes(location.pathname) : true;
  const isFocused = isPageFocused && isWindowFocused;

  const [hasLostFocus, setHasLostFocus] = useState(!isFocused);

  const timerId = useRef<any>();

  if (timerId.current && Date.now() - timerId.current > lostFocusTimeout) {
    if (!hasLostFocus) {
      setHasLostFocus(true);
    }
  }

  useEffect(() => {
    if (!isFocused) {
      timerId.current = Date.now();
    } else {
      timerId.current = undefined;
      if (hasLostFocus) {
        setHasLostFocus(false);
      }
    }

    return () => {
      if (timerId.current) {
        clearTimeout(timerId.current);
      }
    };
  }, [hasLostFocus, isFocused, lostFocusTimeout]);

  if (isDevelopment() && hasLostFocus) {
    // eslint-disable-next-line no-console
    console.log("hasLostFocus", debugId);
  }

  return hasLostFocus;
}
