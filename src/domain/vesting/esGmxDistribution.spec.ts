import { encodeAbiParameters, keccak256 } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM_SEPOLIA } from "config/chains";
import { getContract } from "config/contracts";
import { getPublicClientWithRpc } from "lib/wallets/walletConfig";

import {
  getEsGmxDistributionError,
  getEsGmxIssuerFunding,
  getUnusedEsGmxDistributionBatchIndex,
  type EsGmxDistribution,
} from "./esGmxDistribution";

vi.mock("lib/wallets/walletConfig", () => ({ getPublicClientWithRpc: vi.fn() }));
const readContract = vi.fn();
const multicall = vi.fn();
const UNIT = 10n ** 18n;
const roleStore = "0x433E3C47885b929aEcE4149E3c835E565a20D95c";
const input: EsGmxDistribution = {
  sender: "0x2BE7f46c991dEFF90936fDbEdf987d6bb629BC51",
  recipient: "0x52908400098527886E0F7030069857D2E4169EE7",
  epochId: 0n,
  batchIndex: 0n,
  amount: 100n * UNIT,
};
const funded = [true, [false, 0n, 0n], false, false, 500n * UNIT, 100n * UNIT, 1_000n * UNIT];

describe("Sepolia reward distribution checks", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getPublicClientWithRpc).mockReturnValue({ readContract, multicall } as any);
    readContract.mockResolvedValue(roleStore);
    multicall.mockResolvedValue(funded);
  });

  it("checks the connected distributor and encodes the single-recipient batch hash", async () => {
    expect(await getEsGmxDistributionError(input)).toBeUndefined();
    expect(getPublicClientWithRpc).toHaveBeenCalledWith(ARBITRUM_SEPOLIA);
    const contracts = multicall.mock.calls[0][0].contracts;
    expect(contracts[0]).toMatchObject({
      address: roleStore,
      functionName: "hasRole",
      args: [input.sender, "0x90879bc6ca33f99ca6869f906c07142a39f5f4a56770543f9cac195e6af9581f"],
    });
    expect(contracts[3]).toMatchObject({
      address: getContract(ARBITRUM_SEPOLIA, "EsGmxIssuer"),
      args: [
        0n,
        keccak256(
          encodeAbiParameters([{ type: "address[]" }, { type: "uint256[]" }], [[input.recipient], [input.amount]])
        ),
      ],
    });
    expect(contracts[6].args).toEqual([getContract(ARBITRUM_SEPOLIA, "EsGmxIssuer")]);
    expect(multicall.mock.calls[0][0].allowFailure).toBe(false);
  });

  it.each([
    { index: 0, value: false, reason: "unauthorized" },
    { index: 1, value: [true, 0n, 0n], reason: "finalized" },
    { index: 2, value: true, reason: "usedIndex" },
    { index: 3, value: true, reason: "usedContent" },
  ])("rejects $reason distributions", async ({ index, value, reason }) => {
    const state = [...funded];
    state[index] = value;
    multicall.mockResolvedValue(state);
    expect(await getEsGmxDistributionError(input)).toEqual({ reason });
  });

  it("reserves existing unclaimed rewards when checking issuer funding", async () => {
    multicall.mockResolvedValue([...funded.slice(0, 6), 450n * UNIT]);
    expect(await getEsGmxDistributionError(input)).toEqual({ reason: "funding", shortfall: 50n * UNIT });
    multicall.mockResolvedValue([...funded.slice(0, 6), 500n * UNIT]);
    expect(await getEsGmxDistributionError(input)).toBeUndefined();
  });

  it("does not treat a failed RPC check as permission to distribute", async () => {
    multicall.mockRejectedValue(new Error("RPC unavailable"));
    await expect(getEsGmxDistributionError(input)).rejects.toThrow("RPC unavailable");
  });
});

describe("unused distribution batch index", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getPublicClientWithRpc).mockReturnValue({ readContract, multicall } as any);
  });

  it("starts with zero for an epoch without distributions", async () => {
    readContract.mockResolvedValue([false, 0n, 0n]);
    multicall.mockResolvedValue([false]);
    expect(await getUnusedEsGmxDistributionBatchIndex(123n)).toBe(0n);
    expect(multicall.mock.calls[0][0].contracts).toEqual([
      expect.objectContaining({ functionName: "processedBatchIndexes", args: [123n, 0n] }),
    ]);
  });

  it("finds the first unused index even when later indexes have been used", async () => {
    readContract.mockResolvedValue([false, 4n, 0n]);
    multicall.mockResolvedValue([true, true, false, true, false]);
    expect(await getUnusedEsGmxDistributionBatchIndex(123n)).toBe(2n);
    expect(multicall.mock.calls[0][0].allowFailure).toBe(false);
  });

  it("checks subsequent groups when the first 32 indexes are already used", async () => {
    readContract.mockResolvedValue([false, 32n, 0n]);
    multicall.mockResolvedValueOnce(Array(32).fill(true)).mockResolvedValueOnce([false]);
    expect(await getUnusedEsGmxDistributionBatchIndex(123n)).toBe(32n);
    expect(multicall.mock.calls[1][0].contracts).toEqual([
      expect.objectContaining({ functionName: "processedBatchIndexes", args: [123n, 32n] }),
    ]);
  });

  it("does not return a default when the contract lookup fails", async () => {
    readContract.mockResolvedValue([false, 0n, 0n]);
    multicall.mockRejectedValue(new Error("RPC unavailable"));
    await expect(getUnusedEsGmxDistributionBatchIndex(123n)).rejects.toThrow("RPC unavailable");
  });
});

describe("issuer funding", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getPublicClientWithRpc).mockReturnValue({ multicall } as any);
  });

  it("includes outstanding rewards in the shortfall and reads the connected wallet balance", async () => {
    multicall.mockResolvedValue([500n * UNIT, 100n * UNIT, 450n * UNIT, 60n * UNIT]);
    expect(await getEsGmxIssuerFunding(input.sender, 100n * UNIT)).toEqual({
      shortfall: 50n * UNIT,
      walletBalance: 60n * UNIT,
    });
    const contracts = multicall.mock.calls[0][0].contracts;
    expect(contracts[2]).toMatchObject({
      address: getContract(ARBITRUM_SEPOLIA, "IncentiveEsGmx"),
      args: [getContract(ARBITRUM_SEPOLIA, "EsGmxIssuer")],
    });
    expect(contracts[3].args).toEqual([input.sender]);
    expect(multicall.mock.calls[0][0].allowFailure).toBe(false);
  });

  it("does not request a transfer when the issuer already has sufficient tokens", async () => {
    multicall.mockResolvedValue([500n * UNIT, 100n * UNIT, 600n * UNIT, 60n * UNIT]);
    expect(await getEsGmxIssuerFunding(input.sender, 100n * UNIT)).toEqual({
      shortfall: 0n,
      walletBalance: 60n * UNIT,
    });
  });

  it("does not suggest funding based on failed reads", async () => {
    multicall.mockRejectedValue(new Error("RPC unavailable"));
    await expect(getEsGmxIssuerFunding(input.sender, 100n * UNIT)).rejects.toThrow("RPC unavailable");
  });
});
