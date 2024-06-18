import { ethers } from "ethers";
import { useEffect, useState } from "react";
import type { Account, Chain, Client, Transport } from "viem";
import { Config, useConnectorClient } from "wagmi";

export function clientToSigner(client: Client<Transport, Chain, Account>) {
  const { account, chain, transport } = client;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  const provider = new ethers.BrowserProvider(transport, network);
  const signer = provider.getSigner(account.address);
  return signer;
}

/** Hook to convert a Viem Client to an ethers.js Signer. */
export function useEthersSigner({ chainId }: { chainId?: number } = {}) {
  const { data: client } = useConnectorClient<Config>({ chainId });
  const [signer, setSigner] = useState<ethers.Signer | undefined>(undefined);

  useEffect(() => {
    async function load() {
      if (!client) {
        setSigner(undefined);
        return;
      }
      const signer = await clientToSigner(client);
      setSigner(signer);
    }

    load();
  }, [client]);

  return signer;
}
