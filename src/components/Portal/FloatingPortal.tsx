import { FloatingPortal as BaseFloatingPortal, FloatingPortalProps, useFloatingPortalNode } from "@floating-ui/react";

import { useModalFocusScopePortal } from "components/Modal/modalFocusScope";

export default function FloatingPortal({ children, id, preserveTabOrder, root }: FloatingPortalProps) {
  const portalNode = useFloatingPortalNode({ id, root });
  useModalFocusScopePortal(portalNode);

  if (!portalNode) return null;

  return (
    <BaseFloatingPortal root={portalNode} preserveTabOrder={preserveTabOrder}>
      {children}
    </BaseFloatingPortal>
  );
}
