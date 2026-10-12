import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchWalletChainCapabilities } from "./walletCapabilities";

const mocks = vi.hoisted(() => ({ getCapabilities: vi.fn() }));

vi.mock("@wagmi/core", () => ({ getCapabilities: mocks.getCapabilities }));
vi.mock("./walletConfig", () => ({ getWagmiConfig: () => ({}) }));

const ACCOUNT = "0x0000000000000000000000000000000000000001";
const ARBITRUM = 42161;
const connector = {} as Parameters<typeof fetchWalletChainCapabilities>[0]["connector"];

function fetchCapabilities() {
  return fetchWalletChainCapabilities({ account: ACCOUNT, connector, chainId: ARBITRUM });
}

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("fetchWalletChainCapabilities", () => {
  it("reads the capabilities reported for the chain", async () => {
    mocks.getCapabilities.mockResolvedValue({
      [ARBITRUM]: {
        atomic: { status: "ready" },
        alternateGasFees: { supported: true },
        paymasterService: { supported: false },
      },
    });

    await expect(fetchCapabilities()).resolves.toEqual({
      status: "ok",
      capabilities: { atomicStatus: "ready", hasAlternateGasFees: true, hasPaymasterService: false },
    });
  });

  it("falls back to capabilities reported for all chains", async () => {
    mocks.getCapabilities.mockResolvedValue({
      0: { atomic: { status: "supported" }, paymasterService: { supported: true } },
      [ARBITRUM]: { alternateGasFees: { supported: true } },
    });

    await expect(fetchCapabilities()).resolves.toEqual({
      status: "ok",
      capabilities: { atomicStatus: "supported", hasAlternateGasFees: true, hasPaymasterService: true },
    });
  });

  it("maps the first EIP-5792 draft atomicBatch capability", async () => {
    mocks.getCapabilities.mockResolvedValue({ [ARBITRUM]: { atomicBatch: { supported: false } } });

    await expect(fetchCapabilities()).resolves.toEqual({
      status: "ok",
      capabilities: { atomicStatus: "unsupported", hasAlternateGasFees: undefined, hasPaymasterService: undefined },
    });
  });

  it.each([-32601, -32004, 4200])("reports wallets answering %i as unsupported", async (code) => {
    mocks.getCapabilities.mockRejectedValue(Object.assign(new Error("Method not supported"), { code }));

    await expect(fetchCapabilities()).resolves.toEqual({ status: "unsupported", capabilities: undefined });
  });

  it("reports an error when the wallet rejects the request", async () => {
    mocks.getCapabilities.mockRejectedValue(new Error("internal error"));

    await expect(fetchCapabilities()).resolves.toEqual({ status: "error", capabilities: undefined });
  });

  it("reports a timeout when the wallet does not answer", async () => {
    vi.useFakeTimers();
    mocks.getCapabilities.mockReturnValue(new Promise(() => undefined));

    const result = fetchCapabilities();
    await vi.advanceTimersByTimeAsync(5000);

    await expect(result).resolves.toEqual({ status: "timeout", capabilities: undefined });
  });
});
