import { watchAccount } from "@wagmi/core";
import useSWR from "swr";
import { PublicClient } from "viem";
import { useAccount } from "wagmi";

import { useChainId } from "lib/chains";
import { LRUCache } from "sdk/utils/LruCache";

import { getPublicClientWithRpc, getWagmiConfig } from "./walletConfig";

export enum AccountType {
  PostEip7702EOA, // Post-EIP-7702 EOA (delegated EOA)
  SmartAccount,
  EOA,
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  [AccountType.PostEip7702EOA]: "postEip7702Eoa",
  [AccountType.SmartAccount]: "smartAccount",
  [AccountType.EOA]: "eoa",
};

const ACCOUNT_TYPES_CACHE = new LRUCache<Promise<AccountType>>(100);

let unwatchAccount: (() => void) | undefined;

/** Reconnecting is how a user tells us they added a network, so stop trusting what we saw before it. */
function watchForReconnect() {
  if (unwatchAccount) {
    return;
  }

  unwatchAccount = watchAccount(getWagmiConfig(), {
    onChange: (account, prevAccount) => {
      if (account.address !== prevAccount.address || account.connector?.uid !== prevAccount.connector?.uid) {
        ACCOUNT_TYPES_CACHE.clean();
      }
    },
  });
}

async function fetchAccountType(address: string, client: PublicClient): Promise<AccountType> {
  const bytecode = await client.getCode({ address });
  if (!bytecode || bytecode === "0x") {
    return AccountType.EOA;
  }

  if (bytecode.startsWith("0xef0100") && bytecode.length === 48) {
    return AccountType.PostEip7702EOA;
  }

  return AccountType.SmartAccount;
}

export async function getAccountType(address: string, client: PublicClient): Promise<AccountType> {
  const chainId = client.chain?.id;

  if (chainId === undefined) {
    throw new Error("getAccountType requires a chain-bound client");
  }

  watchForReconnect();

  const key = `chainId:${chainId}:address:${address.toLowerCase()}`;
  let accountTypePromise = ACCOUNT_TYPES_CACHE.get(key);

  if (!accountTypePromise) {
    accountTypePromise = fetchAccountType(address, client).catch((error) => {
      ACCOUNT_TYPES_CACHE.delete(key);

      throw error;
    });
    ACCOUNT_TYPES_CACHE.set(key, accountTypePromise);
  }

  return accountTypePromise;
}

export function useAccountType(): { accountType: AccountType | undefined; isLoading: boolean } {
  const { address, connector } = useAccount();
  const { chainId } = useChainId();

  const { data: accountType, isLoading } = useSWR<AccountType | undefined>(
    address && [address, chainId, connector?.uid, "accountType"],
    {
      fetcher: async () => {
        const publicClient = getPublicClientWithRpc(chainId);

        if (!address || !publicClient) {
          return undefined;
        }

        return getAccountType(address, publicClient);
      },
      refreshInterval: 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  );

  return { accountType, isLoading };
}
