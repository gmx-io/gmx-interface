import { ContractFunctionRevertedError, ContractFunctionZeroDataError, type PublicClient } from "viem";
import { describe, expect, it, vi } from "vitest";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { abis } from "sdk/abis";

import { AccountType, fetchIsErc1271, getAccountCapabilities, getExpressAccountSupport } from "./useAccountType";

const ACCOUNT = "0x1111111111111111111111111111111111111111";

function createClient(readContract: PublicClient["readContract"]): PublicClient {
  return { readContract } as PublicClient;
}

describe("fetchIsErc1271", () => {
  it("accepts a contract that returns an ERC-1271 response", async () => {
    const client = createClient(vi.fn().mockResolvedValue("0xffffffff"));

    await expect(fetchIsErc1271(client, ACCOUNT)).resolves.toBe(true);
  });

  it("accepts a contract that rejects an invalid signature with revert data", async () => {
    const error = new ContractFunctionRevertedError({
      abi: abis.SmartAccount,
      data: "0x12345678",
      functionName: "isValidSignature",
    });
    const client = createClient(vi.fn().mockRejectedValue(error));

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
