import { useChainId } from "lib/chains";

import { useAvailableToTradeAssetSettlementChain } from "components/GmxAccountModal/hooks";

export function useGmxAccountShowDepositButton() {
  const { srcChainId } = useChainId();
  const { gmxAccountUsd, isGmxAccountLoading } = useAvailableToTradeAssetSettlementChain();
  const shouldShowDepositButton = !isGmxAccountLoading && gmxAccountUsd === 0n && srcChainId !== undefined;

  return { shouldShowDepositButton };
}
