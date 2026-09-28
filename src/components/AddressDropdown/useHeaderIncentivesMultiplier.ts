import { useIncentivesV2State } from "context/IncentivesV2Context/IncentivesV2Context";
import { useAccountIncentiveStatus } from "domain/synthetics/incentives/v2/useAccountIncentiveStatus";
import { formatMultiplier } from "domain/synthetics/incentives/v2/utils";

export function useHeaderIncentivesMultiplier({ account, chainId }: { account: string; chainId: number }) {
  const { availability, isActive } = useIncentivesV2State();
  const { data: incentiveStatus } = useAccountIncentiveStatus(chainId, {
    account,
    enabled: isActive,
  });
  const config = availability.status === "active" ? availability.config : undefined;
  const multiplier =
    config && incentiveStatus?.epochTimestamp === config.epochTimestamp ? incentiveStatus.multiplier : undefined;

  return isActive && multiplier !== undefined && multiplier > 0n && config
    ? formatMultiplier(multiplier, config.multiplierDecimals)
    : undefined;
}
