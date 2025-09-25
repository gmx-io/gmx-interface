import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

export default function Portal({ children }) {
  const root = document.body;

  const el = useMemo(() => document.createElement("div"), []);

  useEffect(() => {
    root.appendChild(el);
    return () => root.removeChild(el);
  }, [root, el]);

  return createPortal(children, el);
}
