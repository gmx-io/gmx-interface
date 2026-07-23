import { useWallets } from "@privy-io/react-auth";
import uniq from "lodash/uniq";
import useSWR from "swr";
import {
  type Address,
  BaseError,
  ContractFunctionRevertedError,
  ContractFunctionZeroDataError,
  isAddressEqual,
  type Hex,
  type PublicClient,
  zeroHash,
} from "viem";
import { useAccount } from "wagmi";

import { ARBITRUM, ARBITRUM_SEPOLIA } from "config/chains";
import { useChainId } from "lib/chains";
import { abis } from "sdk/abis";

import { getConnectedPrivyWallet, getIsKnownSmartWalletClient } from "./privyWagmi";
import { getPublicClientWithRpc } from "./walletConfig";

export enum AccountType {
  Safe,
  SmartAccount,
  PostEip7702EOA,
  ERC1271,
  EOA,
}

export type ExpressAccountUnavailableReason = "unsupportedWallet" | "unsupportedChain" | "capabilityCheckFailed";

type AccountCapabilities = {
  isSmartAccount: boolean;
  isNonSigningAccountOnAnyChain: boolean;
};

const KNOWN_SAFE_SINGLETONS: Address[] = [
  "0x3e5c63644e683549055b9be8653de26e0b4cd36e",
  "0xfb1bffc9d739b8d520daf37df666da4c687191ea",
  "0xd9db270c1b5e3bd161e8c8503c55ceabee709552",
  "0x69f4d1788e39c87893c980c06edf4b7f686e2938",
  "0x41675c099f32341bf84bfc5382af534df5c7461a",
  "0x29fcb43b46531bca003ddc8fcb67ffe91900c762",
];

async function isSafeAccount(bytecode: Hex, address: Address, client: PublicClient): Promise<boolean> {
  if (bytecode === "0x") {
    return false;
  }

  const storage = await client.getStorageAt({ address, slot: "0x0" });
  if (!storage) {
    return false;
  }

  const masterCopy = `0x${storage.slice(-40)}` as Address;

  return KNOWN_SAFE_SINGLETONS.some((singleton) => isAddressEqual(singleton, masterCopy));
}

function findError<TError extends Error>(
  error: unknown,
  ErrorClass: new (...args: any[]) => TError
): TError | undefined {
  if (error instanceof ErrorClass) {
    return error;
  }

  if (error instanceof BaseError) {
    const cause = error.walk((item) => item instanceof ErrorClass);
    return cause instanceof ErrorClass ? cause : undefined;
  }

  return undefined;
}

export async function fetchIsErc1271(client: PublicClient, address: Address): Promise<boolean> {
  try {
    await client.readContract({
      address,
      abi: abis.SmartAccount,
      functionName: "isValidSignature",
      args: [zeroHash, "0x"],
    });
    return true;
  } catch (error) {
    if (findError(error, ContractFunctionZeroDataError)) {
      return false;
    }

    const revertedError = findError(error, ContractFunctionRevertedError);
    if (revertedError) {
      return true;
    }

    throw error;
  }
}

export async function getAccountType(address: Address, client: PublicClient): Promise<AccountType> {
  const bytecode = await client.getCode({ address });
  if (!bytecode || bytecode === "0x") {
    return AccountType.EOA;
  }

  if (bytecode.startsWith("0xef0100") && bytecode.length === 48) {
    return AccountType.PostEip7702EOA;
  }

  if (await isSafeAccount(bytecode, address, client)) {
    return AccountType.Safe;
  }

  if (await fetchIsErc1271(client, address)) {
    return AccountType.ERC1271;
  }

  return AccountType.SmartAccount;
}

export function getAccountCapabilities(accountTypes: AccountType[]): AccountCapabilities {
  return {
    isSmartAccount: accountTypes.some(
      (accountType) =>
        accountType === AccountType.Safe ||
        accountType === AccountType.SmartAccount ||
        accountType === AccountType.ERC1271
    ),
    isNonSigningAccountOnAnyChain: accountTypes.some((accountType) => accountType === AccountType.SmartAccount),
  };
}

function useAccountCapabilities(): AccountCapabilities & {
  isLoading: boolean;
  hasError: boolean;
  hasUnsupportedSigningProvider: boolean;
} {
  const { address, chainId: connectedChainId, connector } = useAccount();
  const { wallets, ready: areWalletsReady } = useWallets();
  const { chainId: settlementChainId } = useChainId();
  const connectedWallet = getConnectedPrivyWallet(wallets, address, connector?.id);
  const walletClientType = connectedWallet?.walletClientType;

  const { data, error, isLoading } = useSWR<AccountCapabilities>(
    address && [address, connectedChainId, walletClientType, settlementChainId, "detectAccountCapabilities"],
    {
      fetcher: async () => {
        const chainIds = uniq(
          [settlementChainId, connectedChainId].filter((chainId): chainId is number => chainId !== undefined)
        );

        const accountTypes = await Promise.all(
          chainIds.map((chainId) => getAccountType(address!, getPublicClientWithRpc(chainId)))
        );

        return getAccountCapabilities(accountTypes);
      },
      refreshInterval: 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  );

  return {
    isSmartAccount: (data?.isSmartAccount ?? false) || getIsKnownSmartWalletClient(walletClientType),
    isNonSigningAccountOnAnyChain: data?.isNonSigningAccountOnAnyChain ?? false,
    isLoading: isLoading || (address !== undefined && !areWalletsReady),
    hasError: Boolean(error),
    hasUnsupportedSigningProvider: connector?.id === "gemini",
  };
}

export function useIsNonEoaAccountOnAnyChain(): {
  isNonEoaAccountOnAnyChain: boolean;
  isLoading: boolean;
} {
  const { isSmartAccount, isLoading } = useAccountCapabilities();

  return { isNonEoaAccountOnAnyChain: isSmartAccount, isLoading };
}

export function useNonSigningAccount(): {
  isNonSigningAccountOnAnyChain: boolean;
  isLoading: boolean;
  hasError: boolean;
} {
  const { isNonSigningAccountOnAnyChain, isLoading, hasError } = useAccountCapabilities();

  return { isNonSigningAccountOnAnyChain, isLoading, hasError };
}

export function getExpressAccountSupport({
  chainId,
  isSmartAccount,
  isNonSigningAccountOnAnyChain,
  isLoading,
  hasError,
  hasUnsupportedSigningProvider,
}: {
  chainId: number;
  isSmartAccount: boolean;
  isNonSigningAccountOnAnyChain: boolean;
  isLoading: boolean;
  hasError: boolean;
  hasUnsupportedSigningProvider: boolean;
}): {
  isExpressAccountSupported: boolean;
  unavailableReason: ExpressAccountUnavailableReason | undefined;
} {
  if (isLoading) {
    return { isExpressAccountSupported: false, unavailableReason: undefined };
  }

  if (hasError) {
    return { isExpressAccountSupported: false, unavailableReason: "capabilityCheckFailed" };
  }

  if (isNonSigningAccountOnAnyChain || hasUnsupportedSigningProvider) {
    return { isExpressAccountSupported: false, unavailableReason: "unsupportedWallet" };
  }

  if (isSmartAccount && chainId !== ARBITRUM && chainId !== ARBITRUM_SEPOLIA) {
    return { isExpressAccountSupported: false, unavailableReason: "unsupportedChain" };
  }

  return { isExpressAccountSupported: true, unavailableReason: undefined };
}

export function useExpressAccountSupport(): {
  isSmartAccount: boolean;
  isExpressAccountSupported: boolean;
  unavailableReason: ExpressAccountUnavailableReason | undefined;
  isLoading: boolean;
} {
  const { chainId } = useChainId();
  const capabilities = useAccountCapabilities();
  const support = getExpressAccountSupport({ chainId, ...capabilities });

  return {
    isSmartAccount: capabilities.isSmartAccount,
    isLoading: capabilities.isLoading,
    ...support,
  };
}
