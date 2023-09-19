import { isDevelopment } from "config/env";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import useIsWindowVisible from "./useIsWindowVisible";

export function useHasLostFocus(p: {
  timeout: number;
  checkIsTabFocused?: boolean;
  whiteListedPages?: string[];
  debugId?: string;
}) {
  const { whiteListedPages, checkIsTabFocused, timeout, debugId } = p;

  const isWindowVisible = useIsWindowVisible();
  const location = useLocation();

  const isFocused = useMemo(() => {
    const checks: boolean[] = [];

    if (checkIsTabFocused) {
      checks.push(isWindowVisible);
    }

    if (whiteListedPages?.length) {
      checks.push(whiteListedPages.includes(location.pathname));
    }

    return checks.every(Boolean);
  }, [checkIsTabFocused, isWindowVisible, location.pathname, whiteListedPages]);

  const [hasLostFocus, setHasLostFocus] = useState(!isFocused);

  const timerId = useRef<any>();
  const lostFocusTime = useRef<number>();

  useEffect(() => {
    if (!isFocused && !hasLostFocus) {
      lostFocusTime.current = Date.now();
      timerId.current = setTimeout(() => {
        if (lostFocusTime.current && Date.now() - lostFocusTime.current >= timeout) {
          setHasLostFocus(true);
        }
      }, timeout);
    } else {
      lostFocusTime.current = undefined;
      clearTimeout(timerId.current);

      if (hasLostFocus) {
        setHasLostFocus(false);
      }
    }

    return () => {
      clearTimeout(timerId.current);
    };
  }, [hasLostFocus, isFocused, timeout]);

  if (isDevelopment() && hasLostFocus) {
    // eslint-disable-next-line no-console
    console.log("hasLostFocus", debugId);
  }

  return hasLostFocus;
}
