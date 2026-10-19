import { BaseError } from "viem";
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

    await expect(fetchCapabilities()).resolves.toMatchObject({
      status: "ok",
      capabilities: { atomicStatus: "ready", hasAlternateGasFees: true, hasPaymasterService: false },
    });
  });

  it("falls back to capabilities reported for all chains", async () => {
    mocks.getCapabilities.mockResolvedValue({
      0: { atomic: { status: "supported" }, paymasterService: { supported: true } },
      [ARBITRUM]: { alternateGasFees: { supported: true } },
    });

    await expect(fetchCapabilities()).resolves.toMatchObject({
      status: "ok",
      capabilities: { atomicStatus: "supported", hasAlternateGasFees: true, hasPaymasterService: true },
    });
  });

  it("maps the first EIP-5792 draft atomicBatch capability", async () => {
    mocks.getCapabilities.mockResolvedValue({ [ARBITRUM]: { atomicBatch: { supported: false } } });

    await expect(fetchCapabilities()).resolves.toMatchObject({
      status: "ok",
      capabilities: { atomicStatus: "unsupported", hasAlternateGasFees: undefined, hasPaymasterService: undefined },
    });
  });

  it.each([-32601, -32004, 4200])("reports wallets answering %i as unsupported", async (code) => {
    mocks.getCapabilities.mockRejectedValue(Object.assign(new Error("Method not supported"), { code }));

    await expect(fetchCapabilities()).resolves.toMatchObject({ status: "unsupported", capabilities: undefined });
  });

  it("reports an error when the wallet rejects the request", async () => {
    mocks.getCapabilities.mockRejectedValue(new Error("internal error"));

    await expect(fetchCapabilities()).resolves.toMatchObject({
      status: "error",
      capabilities: undefined,
      errorReason: "unknown",
      errorMessage: "internal error",
    });
  });

  it("reports a timeout when the wallet does not answer", async () => {
    vi.useFakeTimers();
    mocks.getCapabilities.mockReturnValue(new Promise(() => undefined));

    const result = fetchCapabilities();
    await vi.advanceTimersByTimeAsync(30_000);

    await expect(result).resolves.toMatchObject({
      status: "timeout",
      capabilities: undefined,
      errorReason: "timeout",
      durationMs: 30_000,
      timeoutMs: 30_000,
    });
    expect(mocks.getCapabilities).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("recovers a response that arrives after the old five-second deadline without retrying", async () => {
    vi.useFakeTimers();
    mocks.getCapabilities.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ [ARBITRUM]: { atomic: { status: "ready" } } }), 8000))
    );

    const result = fetchCapabilities();
    const settled = vi.fn();
    void result.then(settled);
    await vi.advanceTimersByTimeAsync(5000);
    expect(settled).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(3000);

    await expect(result).resolves.toMatchObject({
      status: "ok",
      capabilities: { atomicStatus: "ready" },
      durationMs: 8000,
      timeoutMs: 30_000,
    });
    expect(mocks.getCapabilities).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    [-32601, "unsupported", "unsupportedMethod"],
    [-32004, "unsupported", "unsupportedMethod"],
    [4200, "unsupported", "unsupportedMethod"],
    [-32002, "error", "requestPending"],
    [4001, "error", "userRejected"],
    [4100, "error", "unauthorized"],
    [4900, "error", "disconnected"],
    [4901, "error", "disconnected"],
    [-32603, "error", "unknown"],
  ])("records wrapped provider code %i as %s/%s", async (code, status, errorReason) => {
    const providerError = Object.assign(new Error("provider error"), { code });
    mocks.getCapabilities.mockRejectedValue(new BaseError("request failed", { cause: providerError }));

    await expect(fetchCapabilities()).resolves.toMatchObject({
      status,
      capabilities: undefined,
      errorCode: code,
      errorName: "Error",
      errorReason,
    });
    expect(mocks.getCapabilities).toHaveBeenCalledTimes(1);
  });

  it("captures synchronous connector failures and numeric string codes", async () => {
    mocks.getCapabilities.mockImplementation(() => {
      throw Object.assign(new Error("method unavailable"), { code: "-32601" });
    });

    await expect(fetchCapabilities()).resolves.toMatchObject({
      status: "unsupported",
      errorCode: -32601,
      errorReason: "unsupportedMethod",
    });
  });

  it("does not overwrite a timeout when a wallet answers after the deadline", async () => {
    vi.useFakeTimers();
    mocks.getCapabilities.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ [ARBITRUM]: { atomic: { status: "ready" } } }), 40_000))
    );

    const settled = vi.fn();
    const result = fetchCapabilities().then(settled);
    await vi.advanceTimersByTimeAsync(40_000);
    await result;

    expect(settled).toHaveBeenCalledTimes(1);
    expect(settled).toHaveBeenCalledWith(expect.objectContaining({ status: "timeout", durationMs: 30_000 }));
  });
});
