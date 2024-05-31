import { isDevelopment } from "config/env";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import useIsWindowVisible from "./useIsWindowVisible";
import { TRADE_LOST_FOCUS_TIMEOUT, WS_LOST_FOCUS_TIMEOUT } from "config/ui";

function useHasLostFocusHelper(p: {
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
      checks.push(whiteListedPages.some((whitelistedPart) => location.pathname.startsWith(whitelistedPart)));
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

      if (isFocused) {
        setHasLostFocus(false);
      }
    }

    return () => {
      clearTimeout(timerId.current);
    };
  }, [hasLostFocus, isFocused, timeout]);

  useEffect(() => {
    if (isDevelopment() && hasLostFocus) {
      // eslint-disable-next-line no-console
      console.log("hasLostFocus", debugId);
    }
  }, [debugId, hasLostFocus]);

  return hasLostFocus;
}

export function useHasLostFocus() {
  const hasPageLostFocus = useHasLostFocusHelper({
    timeout: WS_LOST_FOCUS_TIMEOUT,
    checkIsTabFocused: true,
    debugId: "Tab",
  });

  const v1WhiteListedPages = useMemo(() => ["/v1"], []);

  const hasV1LostFocus = useHasLostFocusHelper({
    timeout: TRADE_LOST_FOCUS_TIMEOUT,
    whiteListedPages: v1WhiteListedPages,
    debugId: "V1 Events",
  });

  const v2WhiteListedPages = useMemo(() => ["/trade", "/v2", "/pools"], []);

  const hasV2LostFocus = useHasLostFocusHelper({
    timeout: TRADE_LOST_FOCUS_TIMEOUT,
    whiteListedPages: v2WhiteListedPages,
    debugId: "V2 Events",
  });

  return {
    hasPageLostFocus,
    hasV1LostFocus: hasV1LostFocus || hasPageLostFocus,
    hasV2LostFocus: hasV2LostFocus || hasPageLostFocus,
  };
}
