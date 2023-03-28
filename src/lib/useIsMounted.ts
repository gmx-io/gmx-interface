import { useEffect, useReducer } from "react";

function useIsMounted() {
  const [mounted, setMounted] = useReducer(() => true, false);
  useEffect(setMounted, [setMounted]);
  return mounted;
}

export default useIsMounted;
