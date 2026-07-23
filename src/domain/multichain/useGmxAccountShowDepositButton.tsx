import { useChainId } from "lib/chains";
import { useExpressAccountSupport } from "lib/wallets/useAccountType";

import { useAvailableToTradeAssetSettlementChain } from "components/GmxAccountModal/hooks";

import { useEmptyAvalancheGmxAccount } from "./useEmptyGmxAccounts";

export function useGmxAccountShowDepositButton() {
  const { srcChainId } = useChainId();
  const { gmxAccountUsd, isGmxAccountLoading } = useAvailableToTradeAssetSettlementChain();
  const { isExpressAccountSupported } = useExpressAccountSupport();
  const { isEmptyAvalancheGmxAccountOrNotConnected } = useEmptyAvalancheGmxAccount();

  const shouldShowDepositButton =
    !isGmxAccountLoading &&
    gmxAccountUsd === 0n &&
    srcChainId !== undefined &&
    isExpressAccountSupported &&
    !isEmptyAvalancheGmxAccountOrNotConnected;

  return { shouldShowDepositButton };
}
