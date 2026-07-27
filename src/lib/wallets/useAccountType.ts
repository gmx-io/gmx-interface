import useSWR from "swr";
import { PublicClient } from "viem";
import { useAccount } from "wagmi";

import { useChainId } from "lib/chains";

import { getPublicClientWithRpc } from "./walletConfig";

export enum AccountType {
  PostEip7702EOA, // Post-EIP-7702 EOA (delegated EOA)
  SmartAccount, // has bytecode — in practice always ERC-1271 capable
  EOA,
}

export async function getAccountType(address: string, client: PublicClient): Promise<AccountType> {
  const bytecode = await client.getCode({ address });
  if (!bytecode || bytecode === "0x") {
    return AccountType.EOA;
  }

  if (bytecode.startsWith("0xef0100") && bytecode.length === 48) {
    return AccountType.PostEip7702EOA;
  }

  return AccountType.SmartAccount;
}

/** Type of the connected account on the current chain. */
export function useAccountType(): { accountType: AccountType | undefined; isLoading: boolean } {
  const { address } = useAccount();
  const { chainId } = useChainId();

  const { data: accountType, isLoading } = useSWR<AccountType | undefined>(
    address && [address, chainId, "accountType"],
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
