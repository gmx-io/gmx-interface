import { useRef } from "react";

export const useLatestValueRef = <T>(value: T) => {
  const ref = useRef(value);
  ref.current = value;
  return ref;
};
