import { type ReactNode, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

import { useModalFocusScopePortal } from "components/Modal/modalFocusScope";

export default function Portal({ children }: { children: ReactNode }) {
  const root = document.body;

  const el = useMemo(() => document.createElement("div"), []);
  useModalFocusScopePortal(el);

  useEffect(() => {
    root.appendChild(el);
    return () => {
      root.removeChild(el);
    };
  }, [root, el]);

  return createPortal(children, el);
}
