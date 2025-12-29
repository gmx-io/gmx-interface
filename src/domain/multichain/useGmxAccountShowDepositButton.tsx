import { useChainId } from "lib/chains";
import { useIsNonEoaAccountOnAnyChain } from "lib/wallets/useAccountType";

import { useAvailableToTradeAssetSettlementChain } from "components/GmxAccountModal/hooks";

export function useGmxAccountShowDepositButton() {
  const { srcChainId } = useChainId();
  const { gmxAccountUsd, isGmxAccountLoading } = useAvailableToTradeAssetSettlementChain();
  const isNonEoaAccountOnAnyChain = useIsNonEoaAccountOnAnyChain();

  const shouldShowDepositButton =
    !isGmxAccountLoading && gmxAccountUsd === 0n && srcChainId !== undefined && !isNonEoaAccountOnAnyChain;

  return { shouldShowDepositButton };
}
