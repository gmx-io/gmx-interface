import { ethers } from "ethers";
import { Config, useConnectorClient } from "wagmi";
import { useEffect } from "react";
import type { Account, Chain, Client, Transport } from "viem";

import { UncheckedJsonRpcSigner } from "lib/rpc/UncheckedJsonRpcSigner";

export function clientToSigner(client: Client<Transport, Chain, Account>) {
  const { account, chain, transport } = client;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  const provider = new ethers.BrowserProvider(transport, network);
  const signer = new UncheckedJsonRpcSigner(provider, account.address);
  return signer;
}

const cache = new Map<string, UncheckedJsonRpcSigner>();

/** Hook to convert a Viem Client to an ethers.js Signer. */
export function useEthersSigner({ chainId }: { chainId?: number } = {}) {
  const { data: client } = useConnectorClient<Config>({ chainId });

  const id = client?.uid;

  useEffect(() => {
    return () => {
      if (id) {
        cache.delete(id);
      }
    };
  }, [id]);

  if (!client || !id) {
    return undefined;
  }

  if (cache.has(id)) {
    return cache.get(id);
  }

  const signer = clientToSigner(client);

  cache.set(id, signer);

  return signer;
}
