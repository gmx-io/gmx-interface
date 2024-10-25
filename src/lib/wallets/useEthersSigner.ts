import { ethers } from "ethers";
import { Config, useConnectorClient } from "wagmi";
import { useMemo } from "react";
import type { Account, Chain, Client, Transport } from "viem";

import { UncheckedJsonRpcSigner } from "lib/rpc/UncheckedJsonRpcSigner";
import { metrics } from "lib/metrics";

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
      metrics.pushError(error, "useEthersSigner");
      return undefined;
    }
  }, [client]);
}
