import { useMemo } from "react";

import { isSolanaNetwork } from "config/chains";
import { isSettlementChain, isValidVisualSettlementChain, MULTI_CHAIN_TOKEN_MAPPING } from "config/multichain";
import { useEmptyAvalancheGmxAccount } from "domain/multichain/useEmptyGmxAccounts";
import { useChainId } from "lib/chains";
import { EMPTY_OBJECT } from "lib/objects";
import type { SettlementChainId } from "sdk/configs/chains";

import { AddressDropdownWithMultichain } from "./AddressDropdownWithMultichain";
import { AddressDropdownWithoutMultichain } from "./AddressDropdownWithoutMultichain";

type Props = {
  account: string;
};

export function AddressDropdown({ account }: Props) {
  const { networkId } = useChainId();

  // Solana uses the same wallet modal as a wallet-only network, not the EVM menu.
  if (isSolanaNetwork(networkId)) {
    return <AddressDropdownWithMultichain account={account} />;
  }

  return <EvmAddressDropdown account={account} />;
}

function EvmAddressDropdown({ account }: { account: string }) {
  const { chainId } = useChainId();

  const { isEmptyAvalancheGmxAccountOrNotConnected } = useEmptyAvalancheGmxAccount();

  const hasRelatedSourceChains = useMemo(
    () =>
      Object.values(MULTI_CHAIN_TOKEN_MAPPING[chainId as SettlementChainId] || EMPTY_OBJECT).some(
        (sourceChainMapping) => Object.keys(sourceChainMapping).length > 0
      ),
    [chainId]
  );

  const showAccountModal =
    !isValidVisualSettlementChain(chainId) ||
    (isSettlementChain(chainId) && hasRelatedSourceChains && !isEmptyAvalancheGmxAccountOrNotConnected);

  if (!showAccountModal) {
    return <AddressDropdownWithoutMultichain account={account} />;
  }

  return <AddressDropdownWithMultichain account={account} />;
}
