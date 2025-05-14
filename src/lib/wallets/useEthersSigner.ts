import { ethers } from "ethers";
import { useMemo } from "react";
import type { Account, Chain, Client, Transport } from "viem";
import { Config, useConnectorClient } from "wagmi";

import { UncheckedJsonRpcSigner } from "lib/rpc/UncheckedJsonRpcSigner";

import { WalletSigner } from ".";

export function clientToSigner(client: Client<Transport, Chain, Account>): WalletSigner {
  const { account, chain, transport } = client;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };

  const provider = new ethers.BrowserProvider(transport, network);
  const signer = new UncheckedJsonRpcSigner(provider, account.address);

  if (!signer.address) {
    signer.address = account.address;
  }

  return signer as WalletSigner;
}

/** Hook to convert a Viem Client to an ethers.js Signer. */
export function useEthersSigner({ chainId }: { chainId?: number } = {}) {
  const { data: client } = useConnectorClient<Config>({ chainId });

  return useMemo(() => {
    if (!client?.account) {
      return undefined;
    }

    try {
      return clientToSigner(client);
    } catch (error) {
      return undefined;
    }
  }, [client]);
}
