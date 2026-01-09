import { useChainId } from "lib/chains";
import { useIsNonEoaAccountOnAnyChain } from "lib/wallets/useAccountType";

import { useAvailableToTradeAssetSettlementChain } from "components/GmxAccountModal/hooks";

import { useEmptyAvalancheGmxAccount } from "./useEmptyGmxAccounts";

export function useGmxAccountShowDepositButton() {
  const { srcChainId } = useChainId();
  const { gmxAccountUsd, isGmxAccountLoading } = useAvailableToTradeAssetSettlementChain();
  const isNonEoaAccountOnAnyChain = useIsNonEoaAccountOnAnyChain();
  const { isEmptyAvalancheGmxAccount } = useEmptyAvalancheGmxAccount();

  const shouldShowDepositButton =
    !isGmxAccountLoading &&
    gmxAccountUsd === 0n &&
    srcChainId !== undefined &&
    !isNonEoaAccountOnAnyChain &&
    !isEmptyAvalancheGmxAccount;

  return { shouldShowDepositButton };
}
