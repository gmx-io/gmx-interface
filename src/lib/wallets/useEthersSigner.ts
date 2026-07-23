import { useWallets } from "@privy-io/react-auth";
import { ethers } from "ethers";
import { useMemo } from "react";
import type { Account, Chain, Client, Transport } from "viem";
import { Config, useAccount, useConnectorClient } from "wagmi";

import { UncheckedJsonRpcSigner } from "lib/rpc/UncheckedJsonRpcSigner";

import { WalletSigner } from ".";
import { getConnectedPrivyWallet, getIsKnownSmartWalletClient } from "./privyWagmi";

export function clientToSigner(
  client: Client<Transport, Chain, Account>,
  account: string,
  isSmartAccount?: boolean
): WalletSigner {
  const { chain, transport } = client;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };

  const provider = new ethers.BrowserProvider(transport, network);
  const signer = new UncheckedJsonRpcSigner(provider, account) as WalletSigner;

  if (!signer.address) {
    signer.address = account;
  }
  signer.isSmartAccount = isSmartAccount;

  return signer;
}

/** Hook to convert a Viem Client to an ethers.js Signer. */
export function useEthersSigner({ chainId }: { chainId?: number } = {}) {
  const { address, connector } = useAccount();
  const { wallets } = useWallets();
  const { data: client } = useConnectorClient<Config>({ chainId });
  const connectedWallet = getConnectedPrivyWallet(wallets, address, connector?.id);
  const isSmartAccount = getIsKnownSmartWalletClient(connectedWallet?.walletClientType);

  return useMemo(() => {
    if (!address || !client?.account) {
      return undefined;
    }

    try {
      return clientToSigner(client, address, isSmartAccount);
    } catch (error) {
      return undefined;
    }
  }, [client, address, isSmartAccount]);
}
