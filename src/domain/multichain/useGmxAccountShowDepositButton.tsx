import { useChainId } from "lib/chains";
import { useWalletCanSignTypedData, useWalletUnavailableChains } from "lib/wallets/useWalletSessionChains";

import { useAvailableToTradeAssetSettlementChain } from "components/GmxAccountModal/hooks";

import { useEmptyAvalancheGmxAccount } from "./useEmptyGmxAccounts";

export function useGmxAccountShowDepositButton() {
  const { chainId, srcChainId } = useChainId();
  const { gmxAccountUsd, isGmxAccountLoading } = useAvailableToTradeAssetSettlementChain();
  const { isEmptyAvalancheGmxAccountOrNotConnected } = useEmptyAvalancheGmxAccount();
  const { canSignTypedData, isLoading: isCanSignLoading } = useWalletCanSignTypedData();
  const { unavailableChains, isLoading: isAvailabilityLoading } = useWalletUnavailableChains([chainId]);

  const shouldShowDepositButton =
    canSignTypedData &&
    !isCanSignLoading &&
    !isAvailabilityLoading &&
    !unavailableChains?.includes(chainId) &&
    !isGmxAccountLoading &&
    gmxAccountUsd === 0n &&
    srcChainId !== undefined &&
    !isEmptyAvalancheGmxAccountOrNotConnected;

  return { shouldShowDepositButton };
}
