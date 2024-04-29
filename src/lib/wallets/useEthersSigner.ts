import { JsonRpcSigner, ethers } from "ethers";
import { useEffect, useState } from "react";
import type { Account, Chain, Client, Transport } from "viem";
import { Config, useConnectorClient } from "wagmi";

async function clientToSigner(client: Client<Transport, Chain, Account>): Promise<JsonRpcSigner> {
  const { account, chain, transport } = client;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  const provider = new ethers.BrowserProvider(transport, network);
  const signer = await provider.getSigner(account.address);
  return signer;
}

/** Action to convert a Viem Client to an ethers.js Signer. */
export function useEthersSigner({ chainId }: { chainId?: number } = {}): JsonRpcSigner | undefined {
  const { data: client } = useConnectorClient<Config>({ chainId });
  const [signer, setSigner] = useState<JsonRpcSigner | undefined>();

  useEffect(() => {
    async function updateSigner() {
      if (client) {
        setSigner(await clientToSigner(client));
      }
    }

    updateSigner();
  }, [client]);

  return signer;
}
