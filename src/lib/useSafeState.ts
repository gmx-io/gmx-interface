import { Dispatch, SetStateAction, useCallback, useState } from "react";

// Safe update the state
export function useSafeState<S>(
  inititalValue?: S | (() => S),
  shouldUpdateFn: (prev: S, next: S) => boolean = (a, b) => a !== b
): [S, Dispatch<SetStateAction<S>>] {
  const [state, setState] = useState<any>(inititalValue);

  const setStateWrapped = useCallback(
    (value: S | ((prevState: S) => S)) => {
      if (typeof value === "function") {
        setState(value);
      } else if (shouldUpdateFn(state, value)) {
        setState(value);
      }
    },
    [shouldUpdateFn, state]
  );

  return [state, setStateWrapped];
}
