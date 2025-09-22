import useSWR from "swr";
import { Hex, PublicClient } from "viem";
import { useAccount, useChainId, usePublicClient } from "wagmi";

export enum AccountType {
  Safe,
  SmartAccount,
  PostEip7702EOA,
  EOA,
}

async function isSafeAccount(address: `0x${string}`, client: PublicClient): Promise<boolean> {
  const bytecode = await client.getBytecode({ address });
  if (!bytecode || bytecode === "0x") {
    return false;
  }

  const storage = await client.getStorageAt({ address, slot: "0x0" });
  if (!storage) {
    return false;
  }

  const masterCopy = `0x${storage.slice(-40)}`.toLowerCase() as Hex;

  const knownSafeSingletons = [
    "0x3e5c63644e683549055b9be8653de26e0b4cd36e", // v1.3.0 L2 default
    "0xfb1bffc9d739b8d520daf37df666da4c687191ea", // v1.3.0 L2
    "0xd9db270c1b5e3bd161e8c8503c55ceabee709552", // v1.3.0
    "0x69f4d1788e39c87893c980c06edf4b7f686e2938", // v1.3.0
    "0x29fcb43b46531bca003ddc8fcb67ffe91900c762", // v1.4.1 L2
  ].map((a) => a.toLowerCase() as Hex);

  return knownSafeSingletons.includes(masterCopy);
}

async function getAccountType(address: `0x${string}`, client: PublicClient): Promise<AccountType> {
  const bytecode = await client.getBytecode({ address });
  if (!bytecode || bytecode === "0x") {
    return AccountType.EOA;
  }

  if (bytecode.startsWith("0xef0100") && bytecode.length === 48) {
    return AccountType.PostEip7702EOA;
  }

  const isSafe = await isSafeAccount(address, client);
  if (isSafe) {
    return AccountType.Safe;
  }

  return AccountType.SmartAccount;
}

export function useAccountType() {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();

  const { data } = useSWR(address && publicClient && [address, publicClient, chainId, "detectAccountType"], {
    fetcher: async () => {
      if (!address || !publicClient) {
        return null;
      }

      const account = await getAccountType(address, publicClient);
      return account;
    },
  });

  return data;
}
