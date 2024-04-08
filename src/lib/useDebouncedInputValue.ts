import { useEffect, useRef, useState } from "react";
import { useLatest } from "react-use";

const DEBOUNCE_MS = 50;

export function useDebouncedInputValue<T>(defaultState: T, commit: (value: T) => void) {
  const [value, setValue] = useState(defaultState);
  const timeoutRef = useRef<number>();
  const latestValue = useLatest(value);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      commit(value);
    }, DEBOUNCE_MS);
  }, [commit, value]);

  useEffect(() => {
    clearTimeout(timeoutRef.current);
    if (defaultState !== latestValue.current) {
      setValue(defaultState);
    }
  }, [defaultState, latestValue]);

  return [value, setValue] as const;
}
