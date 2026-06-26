import { useMemo } from "react";

import { isSettlementChain, MULTI_CHAIN_TOKEN_MAPPING } from "config/multichain";
import { useEmptyAvalancheGmxAccount } from "domain/multichain/useEmptyGmxAccounts";
import { useChainId } from "lib/chains";
import { EMPTY_OBJECT } from "lib/objects";
import type { SettlementChainId } from "sdk/configs/chains";

import { isWalletOnlyChain } from "components/GmxAccountModal/getAccountModalMode";

import { AddressDropdownWithMultichain } from "./AddressDropdownWithMultichain";
import { AddressDropdownWithoutMultichain } from "./AddressDropdownWithoutMultichain";

type Props = {
  account: string;
};

export function AddressDropdown({ account }: Props) {
  const { chainId } = useChainId();

  const { isEmptyAvalancheGmxAccountOrNotConnected } = useEmptyAvalancheGmxAccount();

  const hasRelatedSourceChains = useMemo(
    () =>
      Object.values(MULTI_CHAIN_TOKEN_MAPPING[chainId as SettlementChainId] || EMPTY_OBJECT).some(
        (sourceChainMapping) => Object.keys(sourceChainMapping).length > 0
      ),
    [chainId]
  );

  // Wallet-only chains (Avalanche/Botanix/MegaETH) open the account modal in wallet-first mode per DES-45.
  // Smart-contract wallets also use the modal; the wallet Send action is hidden for them inside WalletBlock
  // since Safe/ERC-4337 (AA) sends aren't supported yet (FEDEV-3882).
  const showAccountModal =
    isWalletOnlyChain(chainId) ||
    (isSettlementChain(chainId) && hasRelatedSourceChains && !isEmptyAvalancheGmxAccountOrNotConnected);

  if (!showAccountModal) {
    return <AddressDropdownWithoutMultichain account={account} />;
  }

  return <AddressDropdownWithMultichain account={account} />;
}
