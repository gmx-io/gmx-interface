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
  keccak256,
  type PublicClient,
  stringToHex,
  toFunctionSelector,
  toHex,
  zeroHash,
} from "viem";
import { useAccount } from "wagmi";

import {
  type AnyChainId,
  ARBITRUM,
  ARBITRUM_SEPOLIA,
  CONTRACTS_CHAIN_IDS,
  isTestnetChain,
  SOURCE_CHAIN_IDS,
} from "config/chains";
import { useChainId } from "lib/chains";
import { abis } from "sdk/abis";

import { getConnectedPrivyWallet, getIsSmartWalletClient } from "./privyWagmi";
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

const KNOWN_SAFE_COMPATIBILITY_FALLBACK_HANDLERS: Address[] = [
  "0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4", // v1.3.0 canonical
  "0x017062a1dE2FE6b99BE3d9d37841FeD19F573804", // v1.3.0 EIP-155
  "0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99", // v1.4.1 canonical
];

const SAFE_FALLBACK_HANDLER_STORAGE_SLOT = keccak256(stringToHex("fallback_manager.handler.address"));
const EIP_1967_IMPLEMENTATION_STORAGE_SLOT = toHex(
  BigInt(keccak256(stringToHex("eip1967.proxy.implementation"))) - 1n,
  { size: 32 }
);
const ERC1271_IS_VALID_SIGNATURE_SELECTOR = toFunctionSelector("isValidSignature(bytes32,bytes)");

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

async function hasSupportedSafeFallbackHandler(address: Address, client: PublicClient): Promise<boolean> {
  const storage = await client.getStorageAt({ address, slot: SAFE_FALLBACK_HANDLER_STORAGE_SLOT });
  if (!storage || storage === "0x") {
    return false;
  }

  const fallbackHandler = `0x${storage.slice(-40)}` as Address;

  return KNOWN_SAFE_COMPATIBILITY_FALLBACK_HANDLERS.some((handler) => isAddressEqual(handler, fallbackHandler));
}

function bytecodeHasErc1271Selector(bytecode: Hex): boolean {
  return bytecode.includes(`63${ERC1271_IS_VALID_SIGNATURE_SELECTOR.slice(2)}`);
}

async function hasErc1271Implementation(bytecode: Hex, address: Address, client: PublicClient): Promise<boolean> {
  if (bytecodeHasErc1271Selector(bytecode)) {
    return true;
  }

  if (await isSafeAccount(bytecode, address, client)) {
    return hasSupportedSafeFallbackHandler(address, client);
  }

  const implementationStorage = await client.getStorageAt({
    address,
    slot: EIP_1967_IMPLEMENTATION_STORAGE_SLOT,
  });
  if (!implementationStorage || implementationStorage === "0x") {
    return false;
  }

  const implementationAddress = `0x${implementationStorage.slice(-40)}` as Address;
  const implementationBytecode = await client.getCode({ address: implementationAddress });

  return Boolean(implementationBytecode && bytecodeHasErc1271Selector(implementationBytecode));
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

export async function fetchIsErc1271(client: PublicClient, address: Address, bytecode?: Hex): Promise<boolean> {
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

    if (findError(error, ContractFunctionRevertedError)) {
      const accountBytecode = bytecode ?? (await client.getCode({ address }));

      return Boolean(accountBytecode && (await hasErc1271Implementation(accountBytecode, address, client)));
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
    return (await hasSupportedSafeFallbackHandler(address, client)) ? AccountType.Safe : AccountType.SmartAccount;
  }

  if (await fetchIsErc1271(client, address, bytecode)) {
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

export function getAccountCapabilityChainIds(currentChainId: number): AnyChainId[] {
  const isCurrentChainTestnet = isTestnetChain(currentChainId);

  return uniq([...CONTRACTS_CHAIN_IDS, ...SOURCE_CHAIN_IDS] as AnyChainId[]).filter(
    (chainId) => isTestnetChain(chainId) === isCurrentChainTestnet
  );
}

function useAccountCapabilities(): AccountCapabilities & {
  isLoading: boolean;
  hasError: boolean;
  hasUnsupportedSigningProvider: boolean;
} {
  const { address, connector } = useAccount();
  const { wallets, ready: areWalletsReady } = useWallets();
  const { chainId } = useChainId();
  const connectedWallet = getConnectedPrivyWallet(wallets, address, connector?.id);
  const walletClientType = connectedWallet?.walletClientType;
  const isCurrentChainTestnet = isTestnetChain(chainId);

  const { data, error, isLoading } = useSWR<AccountCapabilities>(
    address && [address, isCurrentChainTestnet, "detectAccountCapabilities"],
    {
      fetcher: async () => {
        const accountTypes = await Promise.all(
          getAccountCapabilityChainIds(chainId).map((accountChainId) =>
            getAccountType(address!, getPublicClientWithRpc(accountChainId))
          )
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
    isSmartAccount: (data?.isSmartAccount ?? false) || getIsSmartWalletClient(walletClientType),
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
