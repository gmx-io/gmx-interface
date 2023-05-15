import { Dispatch, SetStateAction, useCallback, useState } from "react";

// Safe update the state
export function useSafeState<S>(
  inititalValue?: S | (() => S),
  shouldUpdateFn: (prev: S, next: S) => boolean = (a, b) => a !== b
): [S, Dispatch<SetStateAction<S>>] {
  const [state, _setState] = useState<any>(inititalValue);

  const setState = useCallback(
    (value: S | ((prevState: S) => S)) => {
      if (typeof value === "function") {
        _setState(value);
      } else if (shouldUpdateFn(state, value)) {
        _setState(value);
      }
    },
    [shouldUpdateFn, state]
  );

  return [state, setState];
}
