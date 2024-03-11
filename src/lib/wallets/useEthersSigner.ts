import { providers } from "ethers";
import { useMemo } from "react";
import type { Account, Chain, Client, Transport } from "viem";
import { Config, useConnectorClient } from "wagmi";

export function clientToSigner(client: Client<Transport, Chain, Account>): providers.JsonRpcSigner {
  const { account, chain, transport } = client;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  const provider = new providers.Web3Provider(transport, network);
  const signer = provider.getSigner(account.address);
  return signer;
}

/** Action to convert a Viem Client to an ethers.js Signer. */
export function useEthersSigner({ chainId }: { chainId?: number } = {}): providers.JsonRpcSigner | undefined {
  const { data: client } = useConnectorClient<Config>({ chainId });

  return useMemo(() => (client ? clientToSigner(client) : undefined), [client]);
}
