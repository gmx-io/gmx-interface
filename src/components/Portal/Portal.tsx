import { useEffect, useMemo, type ReactNode } from "react";
import { createPortal } from "react-dom";

export default function Portal({ children }: { children: ReactNode }) {
  const root = document.body;

  const el = useMemo(() => document.createElement("div"), []);

  useEffect(() => {
    root.appendChild(el);
    return () => {
      root.removeChild(el);
    };
  }, [root, el]);

  return createPortal(children, el);
}
