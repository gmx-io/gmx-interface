import { createContext, useCallback, useContext, useMemo } from "react";

import {
  type IncentivesAvailability,
  resolveIncentivesAvailability,
} from "domain/synthetics/incentives/v2/availability";
import { isIncentivesEnabled } from "domain/synthetics/incentives/v2/constants";
import type { IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import { useIncentivesConfig } from "domain/synthetics/incentives/v2/useIncentivesConfig";
import { useChainId } from "lib/chains";

type IncentivesV2ContextValue = {
  availability: IncentivesAvailability;
  isActive: boolean;
  refreshConfig: () => Promise<IncentivesConfig | null | undefined>;
};

const defaultValue: IncentivesV2ContextValue = {
  availability: { status: "unsupported-chain" },
  isActive: false,
  refreshConfig: async () => undefined,
};

const IncentivesV2Context = createContext<IncentivesV2ContextValue>(defaultValue);

export function IncentivesV2ContextProvider({ children }: { children: React.ReactNode }) {
  const { chainId } = useChainId();
  const isSupported = isIncentivesEnabled(chainId);
  const { data: config, error, mutate } = useIncentivesConfig(chainId, { enabled: isSupported });
  const availability = useMemo(
    () => resolveIncentivesAvailability({ supported: isSupported, config, error }),
    [config, error, isSupported]
  );
  const refreshConfig = useCallback(() => mutate(), [mutate]);
  const value = useMemo(
    () => ({
      availability,
      isActive: availability.status === "active",
      refreshConfig,
    }),
    [availability, refreshConfig]
  );

  return <IncentivesV2Context.Provider value={value}>{children}</IncentivesV2Context.Provider>;
}

export function useIncentivesV2State() {
  return useContext(IncentivesV2Context);
}
