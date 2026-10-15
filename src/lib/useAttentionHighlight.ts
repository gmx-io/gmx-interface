import { useEffect, useRef, useState } from "react";

const ATTENTION_HIGHLIGHT_CLASSNAME = "ring-2 ring-blue-300";
const HIGHLIGHT_MS = 2000;

export function useAttentionHighlight<T extends HTMLElement>(trigger: number) {
  const ref = useRef<T>(null);
  const [isHighlighted, setIsHighlighted] = useState(false);

  useEffect(
    function highlightOnTrigger() {
      if (trigger === 0) return;

      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setIsHighlighted(true);

      const timerId = setTimeout(() => setIsHighlighted(false), HIGHLIGHT_MS);

      return () => clearTimeout(timerId);
    },
    [trigger]
  );

  return { ref, highlightClassName: isHighlighted ? ATTENTION_HIGHLIGHT_CLASSNAME : "" };
}
