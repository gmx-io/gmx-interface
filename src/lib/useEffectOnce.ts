import { useEffect, useRef } from "react";

function useEffectOnce(effect) {
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (!hasRunRef.current) {
      effect();
      hasRunRef.current = true;
    }
  }, [effect]);
}

export default useEffectOnce;
