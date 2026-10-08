import { FloatingDelayGroup } from "@floating-ui/react";
import { createContext, ReactNode } from "react";

import { TOOLTIP_CLOSE_DELAY, TOOLTIP_GROUP_TIMEOUT, TOOLTIP_STANDARD_OPEN_DELAY } from "config/ui";

export const TooltipGroupContext = createContext(false);

const GROUP_DELAY = { open: TOOLTIP_STANDARD_OPEN_DELAY, close: TOOLTIP_CLOSE_DELAY };

/**
 * Tooltips inside a group share one hover delay: only the first tooltip waits,
 * the next ones open instantly and without animation while the group is active.
 */
export function TooltipGroup({ children }: { children: ReactNode }) {
  return (
    <FloatingDelayGroup delay={GROUP_DELAY} timeoutMs={TOOLTIP_GROUP_TIMEOUT}>
      <TooltipGroupContext.Provider value={true}>{children}</TooltipGroupContext.Provider>
    </FloatingDelayGroup>
  );
}
