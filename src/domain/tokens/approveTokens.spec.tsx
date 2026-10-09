import type { Signer } from "ethers";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { INVALID_PERMIT_SIGNATURE_ERROR } from "lib/errors/customErrors";

import { approveTokens } from "./approveTokens";

const mocks = vi.hoisted(() => ({
  approve: vi.fn(),
  sendTokenPermitMetric: vi.fn(),
  addTokenPermit: vi.fn(),
  disableTokenPermits: vi.fn(),
}));

vi.mock("ethers", async (importOriginal) => {
  const original = await importOriginal<typeof import("ethers")>();

  class FakeContract {
    interface = { encodeFunctionData: () => "0x" };
    approve = mocks.approve;
  }

  return { ...original, ethers: { ...original.ethers, Contract: FakeContract } };
});

vi.mock("lib/metrics/tokenPermitMetrics", () => ({ sendTokenPermitMetric: mocks.sendTokenPermitMetric }));
vi.mock("lib/metrics", () => ({ metrics: { pushError: vi.fn() } }));
vi.mock("lib/rpc", () => ({ getProvider: vi.fn() }));
vi.mock("lib/gas/estimateGasLimit", () => ({ estimateGasLimit: async () => 100000n }));
vi.mock("lib/helperToast", () => ({ helperToast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const ARBITRUM = 42161;
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const ROUTER = "0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6";

const signer = { getAddress: async () => "0x0000000000000000000000000000000000000001" } as unknown as Signer;

function approveWithPermit() {
  return approveTokens({
    setIsApproving: vi.fn(),
    signer,
    tokenAddress: USDC,
    spender: ROUTER,
    chainId: ARBITRUM,
    approveAmount: 100n,
    permitParams: {
      addTokenPermit: mocks.addTokenPermit,
      disableTokenPermits: mocks.disableTokenPermits,
      accountType: "eoa",
    },
  });
}

const metricParams = { chainId: ARBITRUM, tokenAddress: USDC, accountType: "eoa" };

describe("approveTokens with a permit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.approve.mockResolvedValue({ hash: "0xabc" });
  });

  it("signs the permit instead of sending an approval", async () => {
    mocks.addTokenPermit.mockResolvedValue(undefined);

    await expect(approveWithPermit()).resolves.toBeUndefined();

    expect(mocks.addTokenPermit).toHaveBeenCalledWith(USDC, ROUTER, 100n);
    expect(mocks.approve).not.toHaveBeenCalled();
    expect(mocks.sendTokenPermitMetric).toHaveBeenCalledWith({ ...metricParams, outcome: "signed" });
  });

  it("stops without an approval when the user rejects the permit", async () => {
    mocks.addTokenPermit.mockRejectedValue(new Error("User rejected the request."));

    await approveWithPermit();

    expect(mocks.approve).not.toHaveBeenCalled();
    expect(mocks.disableTokenPermits).not.toHaveBeenCalled();
    expect(mocks.sendTokenPermitMetric).toHaveBeenCalledWith({ ...metricParams, outcome: "rejected" });
  });

  it.each([
    [new Error("wallet can't sign typed data"), "failed"],
    [new Error(INVALID_PERMIT_SIGNATURE_ERROR), "invalidSignature"],
  ])("falls back to the approval transaction when signing fails (%s)", async (error, reason) => {
    mocks.addTokenPermit.mockRejectedValue(error);

    await expect(approveWithPermit()).resolves.toEqual({ hash: "0xabc" });

    expect(mocks.disableTokenPermits).toHaveBeenCalledWith([USDC]);
    expect(mocks.approve).toHaveBeenCalledWith(ROUTER, 100n, expect.anything());
    expect(mocks.sendTokenPermitMetric).toHaveBeenCalledWith({ ...metricParams, outcome: "fallback", reason });
  });
});
