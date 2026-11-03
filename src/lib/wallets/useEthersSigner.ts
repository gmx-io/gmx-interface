import { ethers } from "ethers";
import { useMemo } from "react";
import type { Account, Chain, Client, Transport } from "viem";
import { Config, useAccount, useConnectorClient } from "wagmi";

import { getErrorText } from "lib/errors";
import { UncheckedJsonRpcSigner } from "lib/rpc/UncheckedJsonRpcSigner";

import { WalletSigner } from ".";

type WalletRequestError = Error & { code?: unknown; data?: unknown };

function normalizeWalletRequestError(error: unknown): unknown {
  if (typeof error !== "object" || error === null) {
    return new Error(getErrorText(error) ?? "Unknown error");
  }

  const { message, code, data } = error as { message?: unknown; code?: unknown; data?: { message?: unknown } };

  if (getErrorText(message) !== undefined || getErrorText(data?.message) !== undefined) {
    return error;
  }

  const normalized: WalletRequestError = new Error("Unknown error");
  normalized.code = code;
  normalized.data = data;

  return normalized;
}

export function clientToSigner(
  client: Client<Transport, Chain, Account>,
  account: string,
  validateBeforeRequest?: () => void
): WalletSigner {
  const { chain, transport } = client;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };

  const provider = new ethers.BrowserProvider(
    {
      request: async (args) => {
        if (args.method === "eth_sendTransaction" || args.method === "eth_signTypedData_v4") {
          validateBeforeRequest?.();
        }

        try {
          return await transport.request(args);
        } catch (error) {
          throw normalizeWalletRequestError(error);
        }
      },
    },
    network
  );
  const signer = new UncheckedJsonRpcSigner(provider, account);

  if (!signer.address) {
    signer.address = account;
  }

  return signer as WalletSigner;
}

/** Hook to convert a Viem Client to an ethers.js Signer. */
export function useEthersSigner({ chainId }: { chainId?: number } = {}) {
  const { address } = useAccount();
  const { data: client } = useConnectorClient<Config>({ chainId });

  return useMemo(() => {
    if (!address || !client?.account) {
      return undefined;
    }

    try {
      return clientToSigner(client, address);
    } catch (error) {
      return undefined;
    }
  }, [client, address]);
}
