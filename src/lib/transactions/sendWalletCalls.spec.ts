import { beforeEach, describe, expect, it, vi } from "vitest";

import { getIsWalletBatchingDisabledForSession, getWalletBatchingSessionKey } from "lib/wallets/walletBatchingSession";

import { sendWalletCalls, type WalletCallsBatch } from "./sendWalletCalls";

const mocks = vi.hoisted(() => ({
  sendCalls: vi.fn(),
  getCallsStatus: vi.fn(),
  pushEvent: vi.fn(),
  now: 0,
}));

vi.mock("@wagmi/core", () => ({
  getAccount: () => ({ connector: { uid: "connector" } }),
  sendCalls: mocks.sendCalls,
  getCallsStatus: mocks.getCallsStatus,
}));
// waiting for the status only moves a fake clock, so the timeout runs out instantly
vi.mock("lib/sleep", () => ({
  sleep: async (ms: number) => {
    mocks.now += ms;
  },
}));
vi.mock("lib/wallets/walletConfig", () => ({ getWagmiConfig: () => ({ chains: [] }) }));
vi.mock("lib/metrics", () => ({ metrics: { pushEvent: mocks.pushEvent } }));

const CHAIN_ID = 42161;
const TOKEN = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const ROUTER = "0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6";
const APPROVE = { to: TOKEN, data: "0x095ea7b3" } as const;
const ACTION = { to: ROUTER, data: "0xac9650d8", value: 1n } as const;

let accountIndex = 0;

// the session store outlives a test, so every test gets its own account
function nextAccount() {
  accountIndex += 1;
  return `0x${accountIndex.toString(16).padStart(40, "0")}`;
}

function send(account: string, batch: Partial<WalletCallsBatch> = {}) {
  return sendWalletCalls({
    chainId: CHAIN_ID,
    account,
    calls: [APPROVE, ACTION],
    batch: { calls: [APPROVE], flow: "trade", atomicStatus: "ready", ...batch },
  });
}

function getOutcomes() {
  return mocks.pushEvent.mock.calls.map(([event]) => event.data.outcome);
}

function rpcError(code: number) {
  return Object.assign(new Error("wallet error"), { cause: { code } });
}

function getIsDisabled(account: string) {
  return getIsWalletBatchingDisabledForSession(
    getWalletBatchingSessionKey({ connectorUid: "connector", account, chainId: CHAIN_ID })
  );
}

describe("sendWalletCalls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.now = 0;
    vi.spyOn(Date, "now").mockImplementation(() => mocks.now);
    mocks.sendCalls.mockResolvedValue({ id: "bundle" });
    mocks.getCallsStatus.mockResolvedValue({
      status: "success",
      statusCode: 200,
      receipts: [{ transactionHash: "0xhash" }],
    });
  });

  it("sends the calls as one atomic batch and returns the hash of the mined transaction", async () => {
    const account = nextAccount();
    const onOutcome = vi.fn();

    await expect(send(account, { onOutcome })).resolves.toEqual({ transactionHash: "0xhash" });

    expect(mocks.sendCalls).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ account, calls: [APPROVE, ACTION], chainId: CHAIN_ID, forceAtomic: true })
    );
    expect(getOutcomes()).toEqual(["sent", "confirmed"]);
    expect(onOutcome.mock.calls.map(([outcome]) => outcome)).toEqual(["sent", "confirmed"]);
    expect(getIsDisabled(account)).toBe(false);
  });

  it.each([
    { name: "the smart account upgrade is declined", code: 5750, outcome: "upgradeRejected" },
    { name: "the batch is rejected", code: 4001, outcome: "rejected" },
    { name: "the wallet has no wallet_sendCalls", code: -32601, outcome: "unsupported" },
    { name: "the wallet can't run it atomically", code: 5760, outcome: "unsupported" },
  ])("falls back to the step-by-step flow for the session when $name", async ({ code, outcome }) => {
    const account = nextAccount();
    mocks.sendCalls.mockRejectedValue(rpcError(code));

    await expect(send(account)).rejects.toThrow("wallet error");

    expect(getOutcomes()).toEqual([outcome]);
    expect(mocks.pushEvent.mock.calls[0][0].data).toMatchObject({
      errorCode: code,
      atomicStatus: "ready",
      callsCount: 2,
    });
    expect(getIsDisabled(account)).toBe(true);
  });

  it("fails without turning batching off when the mined batch reverts", async () => {
    const account = nextAccount();
    mocks.getCallsStatus.mockResolvedValue({ status: "failure", statusCode: 500, receipts: [] });

    await expect(send(account)).rejects.toThrow("Wallet call bundle failed");

    expect(getOutcomes()).toEqual(["sent", "failed"]);
    expect(getIsDisabled(account)).toBe(false);
  });

  it("waits past failed status requests until the wallet reports the result", async () => {
    mocks.getCallsStatus
      .mockRejectedValueOnce(new Error("status unavailable"))
      .mockResolvedValueOnce({ status: "pending", statusCode: 100 })
      .mockResolvedValueOnce({ status: "success", statusCode: 200, receipts: [{ transactionHash: "0xhash" }] });

    await expect(send(nextAccount())).resolves.toEqual({ transactionHash: "0xhash" });

    expect(mocks.getCallsStatus).toHaveBeenCalledTimes(3);
    expect(getOutcomes()).toEqual(["sent", "confirmed"]);
  });

  it("reports an unknown result when the wallet never reports the batch status", async () => {
    mocks.getCallsStatus.mockResolvedValue({ status: "pending", statusCode: 100 });

    await expect(send(nextAccount())).rejects.toThrow("didn't report its result");

    expect(getOutcomes()).toEqual(["sent", "statusUnknown"]);
  });
});
