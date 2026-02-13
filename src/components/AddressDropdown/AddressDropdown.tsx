import { useMemo } from "react";

import { isSettlementChain, MULTI_CHAIN_TOKEN_MAPPING } from "config/multichain";
import { useEmptyAvalancheGmxAccount } from "domain/multichain/useEmptyGmxAccounts";
import { useChainId } from "lib/chains";
import { EMPTY_OBJECT } from "lib/objects";
import { useIsNonEoaAccountOnAnyChain } from "lib/wallets/useAccountType";
import type { SettlementChainId } from "sdk/configs/chains";

import { AddressDropdownWithMultichain } from "./AddressDropdownWithMultichain";
import { AddressDropdownWithoutMultichain } from "./AddressDropdownWithoutMultichain";

type Props = {
  account: string;
};

export function AddressDropdown({ account }: Props) {
  const { chainId } = useChainId();

  const { isNonEoaAccountOnAnyChain } = useIsNonEoaAccountOnAnyChain();
  const { isEmptyAvalancheGmxAccountOrNotConnected } = useEmptyAvalancheGmxAccount();

  const hasRelatedSourceChains = useMemo(
    () =>
      Object.values(MULTI_CHAIN_TOKEN_MAPPING[chainId as SettlementChainId] || EMPTY_OBJECT).some(
        (sourceChainMapping) => Object.keys(sourceChainMapping).length > 0
      ),
    [chainId]
  );

  if (
    !isSettlementChain(chainId) ||
    !hasRelatedSourceChains ||
    isNonEoaAccountOnAnyChain ||
    isEmptyAvalancheGmxAccountOrNotConnected
  ) {
    return <AddressDropdownWithoutMultichain account={account} />;
  }

  return <AddressDropdownWithMultichain account={account} />;
}
