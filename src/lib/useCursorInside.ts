import { RefObject, useEffect, useState, useCallback } from "react";

export function useCursorInside(ref: RefObject<HTMLElement>) {
  const [isCursorInside, setIsCursorInside] = useState(false);

  const handleMouseEnter = useCallback(() => setIsCursorInside(true), []);
  const handleMouseLeave = useCallback(() => setIsCursorInside(false), []);

  useEffect(() => {
    const element = ref.current;
    if (element) {
      element.addEventListener("mouseenter", handleMouseEnter);
      element.addEventListener("mouseleave", handleMouseLeave);

      return () => {
        element.removeEventListener("mouseenter", handleMouseEnter);
        element.removeEventListener("mouseleave", handleMouseLeave);
      };
    }
  }, [ref, handleMouseEnter, handleMouseLeave]);

  return isCursorInside;
}
