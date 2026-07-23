import { ContractFunctionRevertedError, ContractFunctionZeroDataError, type Hex, type PublicClient } from "viem";
import { describe, expect, it, vi } from "vitest";

import {
  ARBITRUM,
  ARBITRUM_SEPOLIA,
  AVALANCHE,
  AVALANCHE_FUJI,
  SOURCE_BASE_MAINNET,
  SOURCE_SEPOLIA,
} from "config/chains";
import { abis } from "sdk/abis";

import {
  AccountType,
  fetchIsErc1271,
  getAccountCapabilities,
  getAccountCapabilityChainIds,
  getAccountType,
  getExpressAccountSupport,
} from "./useAccountType";

const ACCOUNT = "0x1111111111111111111111111111111111111111";
const SAFE_SINGLETON = "0x3e5c63644e683549055b9be8653de26e0b4cd36e";
const SAFE_COMPATIBILITY_FALLBACK_HANDLER = "0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99";

function createClient(readContract: PublicClient["readContract"]): PublicClient {
  return {
    readContract,
    getCode: vi.fn().mockResolvedValue("0x6000"),
    getStorageAt: vi.fn().mockResolvedValue(undefined),
  } as unknown as PublicClient;
}

function addressStorageValue(address: string): Hex {
  return `0x${"0".repeat(24)}${address.slice(2)}` as Hex;
}

describe("fetchIsErc1271", () => {
  it("accepts a contract that returns an ERC-1271 response", async () => {
    const client = createClient(vi.fn().mockResolvedValue("0xffffffff"));

    await expect(fetchIsErc1271(client, ACCOUNT)).resolves.toBe(true);
  });

  it("does not treat an arbitrary contract revert as ERC-1271 support", async () => {
    const error = new ContractFunctionRevertedError({
      abi: abis.SmartAccount,
      data: "0x12345678",
      functionName: "isValidSignature",
    });
    const client = createClient(vi.fn().mockRejectedValue(error));

    await expect(fetchIsErc1271(client, ACCOUNT)).resolves.toBe(false);
  });

  it("accepts a reverting contract with an ERC-1271 implementation", async () => {
    const error = new ContractFunctionRevertedError({
      abi: abis.SmartAccount,
      data: "0x12345678",
      functionName: "isValidSignature",
    });
    const client = createClient(vi.fn().mockRejectedValue(error));
    vi.mocked(client.getCode).mockResolvedValue("0x631626ba7e");

    await expect(fetchIsErc1271(client, ACCOUNT)).resolves.toBe(true);
  });

  it("rejects accounts that return no contract data", async () => {
    const error = new ContractFunctionZeroDataError({ functionName: "isValidSignature" });
    const client = createClient(vi.fn().mockRejectedValue(error));

    await expect(fetchIsErc1271(client, ACCOUNT)).resolves.toBe(false);
  });

  it("does not treat RPC failures as signing support", async () => {
    const client = createClient(vi.fn().mockRejectedValue(new Error("RPC unavailable")));

    await expect(fetchIsErc1271(client, ACCOUNT)).rejects.toThrow("RPC unavailable");
  });
});

describe("getAccountType", () => {
  it("supports a Safe with a compatible signature fallback handler", async () => {
    const client = {
      getCode: vi.fn().mockResolvedValue("0x1234"),
      getStorageAt: vi
        .fn()
        .mockResolvedValueOnce(addressStorageValue(SAFE_SINGLETON))
        .mockResolvedValueOnce(addressStorageValue(SAFE_COMPATIBILITY_FALLBACK_HANDLER)),
      readContract: vi.fn(),
    } as unknown as PublicClient;

    await expect(getAccountType(ACCOUNT, client)).resolves.toBe(AccountType.Safe);
  });

  it("blocks a Safe without a compatible signature fallback handler", async () => {
    const client = {
      getCode: vi.fn().mockResolvedValue("0x1234"),
      getStorageAt: vi
        .fn()
        .mockResolvedValueOnce(addressStorageValue(SAFE_SINGLETON))
        .mockResolvedValueOnce(addressStorageValue("0x0000000000000000000000000000000000000000")),
      readContract: vi.fn(),
    } as unknown as PublicClient;

    await expect(getAccountType(ACCOUNT, client)).resolves.toBe(AccountType.SmartAccount);
  });

  it("supports a generic contract with a decoded ERC-1271 response", async () => {
    const client = {
      getCode: vi.fn().mockResolvedValue("0x1234"),
      getStorageAt: vi.fn().mockResolvedValue(addressStorageValue("0x0000000000000000000000000000000000000000")),
      readContract: vi.fn().mockResolvedValue("0xffffffff"),
    } as unknown as PublicClient;

    await expect(getAccountType(ACCOUNT, client)).resolves.toBe(AccountType.ERC1271);
  });
});

describe("getAccountCapabilities", () => {
  it("allows EOAs and EIP-7702 accounts", () => {
    expect(getAccountCapabilities([AccountType.EOA, AccountType.PostEip7702EOA])).toEqual({
      isSmartAccount: false,
      isNonSigningAccountOnAnyChain: false,
    });
  });

  it("allows Safe and ERC-1271 smart accounts", () => {
    expect(getAccountCapabilities([AccountType.Safe, AccountType.ERC1271])).toEqual({
      isSmartAccount: true,
      isNonSigningAccountOnAnyChain: false,
    });
  });

  it("blocks a contract without a validated signing path", () => {
    expect(getAccountCapabilities([AccountType.ERC1271, AccountType.SmartAccount])).toEqual({
      isSmartAccount: true,
      isNonSigningAccountOnAnyChain: true,
    });
  });
});

describe("getAccountCapabilityChainIds", () => {
  it("includes every production account chain before the wallet switches", () => {
    const chainIds = getAccountCapabilityChainIds(ARBITRUM);

    expect(chainIds).toContain(ARBITRUM);
    expect(chainIds).toContain(AVALANCHE);
    expect(chainIds).toContain(SOURCE_BASE_MAINNET);
    expect(chainIds).not.toContain(ARBITRUM_SEPOLIA);
    expect(chainIds).not.toContain(AVALANCHE_FUJI);
  });

  it("keeps testnet capability checks separate from production", () => {
    const chainIds = getAccountCapabilityChainIds(ARBITRUM_SEPOLIA);

    expect(chainIds).toContain(ARBITRUM_SEPOLIA);
    expect(chainIds).toContain(AVALANCHE_FUJI);
    expect(chainIds).toContain(SOURCE_SEPOLIA);
    expect(chainIds).not.toContain(ARBITRUM);
    expect(chainIds).not.toContain(SOURCE_BASE_MAINNET);
  });
});

describe("getExpressAccountSupport", () => {
  it("allows an EOA on supported Express networks", () => {
    expect(
      getExpressAccountSupport({
        chainId: AVALANCHE,
        isSmartAccount: false,
        isNonSigningAccountOnAnyChain: false,
        isLoading: false,
        hasError: false,
        hasUnsupportedSigningProvider: false,
      })
    ).toEqual({ isExpressAccountSupported: true, unavailableReason: undefined });
  });

  it("allows a validated smart account on Arbitrum", () => {
    expect(
      getExpressAccountSupport({
        chainId: ARBITRUM,
        isSmartAccount: true,
        isNonSigningAccountOnAnyChain: false,
        isLoading: false,
        hasError: false,
        hasUnsupportedSigningProvider: false,
      })
    ).toEqual({ isExpressAccountSupported: true, unavailableReason: undefined });
  });

  it("routes a smart account on an unsupported chain to Classic", () => {
    expect(
      getExpressAccountSupport({
        chainId: AVALANCHE,
        isSmartAccount: true,
        isNonSigningAccountOnAnyChain: false,
        isLoading: false,
        hasError: false,
        hasUnsupportedSigningProvider: false,
      })
    ).toEqual({ isExpressAccountSupported: false, unavailableReason: "unsupportedChain" });
  });

  it("routes an unsupported contract account to Classic", () => {
    expect(
      getExpressAccountSupport({
        chainId: ARBITRUM,
        isSmartAccount: true,
        isNonSigningAccountOnAnyChain: true,
        isLoading: false,
        hasError: false,
        hasUnsupportedSigningProvider: false,
      })
    ).toEqual({ isExpressAccountSupported: false, unavailableReason: "unsupportedWallet" });
  });

  it("fails closed when capability detection fails", () => {
    expect(
      getExpressAccountSupport({
        chainId: ARBITRUM,
        isSmartAccount: false,
        isNonSigningAccountOnAnyChain: false,
        isLoading: false,
        hasError: true,
        hasUnsupportedSigningProvider: false,
      })
    ).toEqual({ isExpressAccountSupported: false, unavailableReason: "capabilityCheckFailed" });
  });

  it("fails closed without showing an error while capability detection is loading", () => {
    expect(
      getExpressAccountSupport({
        chainId: ARBITRUM,
        isSmartAccount: false,
        isNonSigningAccountOnAnyChain: false,
        isLoading: true,
        hasError: false,
        hasUnsupportedSigningProvider: false,
      })
    ).toEqual({ isExpressAccountSupported: false, unavailableReason: undefined });
  });

  it("preserves provider-specific signing restrictions", () => {
    expect(
      getExpressAccountSupport({
        chainId: ARBITRUM,
        isSmartAccount: false,
        isNonSigningAccountOnAnyChain: false,
        isLoading: false,
        hasError: false,
        hasUnsupportedSigningProvider: true,
      })
    ).toEqual({ isExpressAccountSupported: false, unavailableReason: "unsupportedWallet" });
  });
});
