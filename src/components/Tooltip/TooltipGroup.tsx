import { createContext, ReactNode, useMemo } from "react";

import { TOOLTIP_GROUP_TIMEOUT } from "config/ui";

type OpenTooltip = { id: string; close: () => void };

export type TooltipGroupStore = {
  isActive: () => boolean;
  open: (id: string, close: () => void) => void;
  close: (id: string) => void;
};

export const TooltipGroupContext = createContext<TooltipGroupStore | null>(null);

export function TooltipGroup({ children }: { children: ReactNode }) {
  const store = useMemo(createTooltipGroupStore, []);

  return <TooltipGroupContext.Provider value={store}>{children}</TooltipGroupContext.Provider>;
}

function createTooltipGroupStore(): TooltipGroupStore {
  let openTooltip: OpenTooltip | null = null;
  let lastCloseTime = -Infinity;

  return {
    isActive: () => openTooltip !== null || performance.now() - lastCloseTime < TOOLTIP_GROUP_TIMEOUT,
    open(id, close) {
      const previous = openTooltip;
      openTooltip = { id, close };

      if (previous && previous.id !== id) {
        previous.close();
      }
    },
    close(id) {
      if (openTooltip?.id === id) {
        openTooltip = null;
        lastCloseTime = performance.now();
      }
    },
  };
}
