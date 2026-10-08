import { BrowserProvider, toQuantity, type Eip1193Provider } from "ethers";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UncheckedJsonRpcSigner } from "lib/rpc/UncheckedJsonRpcSigner";

import { approveTokens } from "./approveTokens";

const mocks = vi.hoisted(() => ({ pushEvent: vi.fn() }));

vi.mock("lib/rpc", () => ({ getProvider: vi.fn() }));
vi.mock("lib/helperToast", () => ({ helperToast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("lib/gas/estimateGasLimit", () => ({ estimateGasLimit: async () => 100000n }));
vi.mock("lib/metrics", () => ({ metrics: { pushError: vi.fn(), pushEvent: mocks.pushEvent } }));

const ARBITRUM = 42161;
const ACCOUNT = "0x0000000000000000000000000000000000000001";
const SPENDER = "0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6";
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const GM_BTC_USD = "0x47c031236e19d024b42f8AE6780E44A573170703";
const HASH = `0x${"ab".repeat(32)}`;
const providers: BrowserProvider[] = [];

function createSigner(sendTransaction: () => Promise<string>) {
  const request = vi.fn<Eip1193Provider["request"]>(async ({ method }) => {
    if (method === "eth_chainId") return toQuantity(ARBITRUM);
    if (method === "eth_sendTransaction") return sendTransaction();
    throw new Error(`Unexpected request: ${method}`);
  });
  const provider = new BrowserProvider({ request }, ARBITRUM);
  providers.push(provider);

  return new UncheckedJsonRpcSigner(provider, ACCOUNT);
}

function approve({
  sendTransaction,
  tokenAddress = USDC,
  approveAmount,
}: {
  sendTransaction: () => Promise<string>;
  tokenAddress?: string;
  approveAmount?: bigint;
}) {
  return approveTokens({
    chainId: ARBITRUM,
    signer: createSigner(sendTransaction),
    tokenAddress,
    spender: SPENDER,
    approveAmount,
    permitParams: undefined,
    setIsApproving: vi.fn(),
    metric: { flow: "trade", isExpress: true, isGasPaymentToken: true },
  });
}

function getApprovalEvents() {
  return mocks.pushEvent.mock.calls.map(([event]) => event).filter((event) => event.event === "tokenApproval");
}

afterEach(() => {
  providers.splice(0).forEach((provider) => provider.destroy());
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("approveTokens metric", () => {
  it("reports an accepted unlimited approval transaction with its context", async () => {
    await approve({ sendTransaction: async () => HASH });

    expect(getApprovalEvents()).toEqual([
      {
        event: "tokenApproval",
        isError: false,
        data: {
          flow: "trade",
          isExpress: true,
          isGasPaymentToken: true,
          method: "transaction",
          outcome: "accepted",
          chainId: ARBITRUM,
          tokenAddress: USDC,
          tokenSymbol: "USDC",
          spenderAddress: SPENDER,
          isUnlimited: true,
        },
      },
    ]);
  });

  it("reports a rejected approval when the user denies the transaction", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await approve({
      sendTransaction: async () => {
        throw Object.assign(new Error("User denied transaction signature"), { code: 4001 });
      },
    });

    expect(getApprovalEvents()).toEqual([
      expect.objectContaining({ data: expect.objectContaining({ method: "transaction", outcome: "rejected" }) }),
    ]);
  });

  it("reports a failed approval when the transaction errors for another reason", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await approve({
      sendTransaction: async () => {
        throw new Error("internal error");
      },
    });

    expect(getApprovalEvents()).toEqual([
      expect.objectContaining({ data: expect.objectContaining({ method: "transaction", outcome: "failed" }) }),
    ]);
  });

  it("names GM tokens and marks exact amounts as limited", async () => {
    await approve({ sendTransaction: async () => HASH, tokenAddress: GM_BTC_USD, approveAmount: 100n });

    expect(getApprovalEvents()).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({ tokenAddress: GM_BTC_USD, tokenSymbol: "GM", isUnlimited: false }),
      }),
    ]);
  });
});

describe("approveTokens permit metric", () => {
  function approveWithPermit(addTokenPermit: () => Promise<void>, sendTransaction = async () => HASH) {
    return approveTokens({
      chainId: ARBITRUM,
      signer: createSigner(sendTransaction),
      tokenAddress: USDC,
      spender: SPENDER,
      approveAmount: undefined,
      permitParams: { addTokenPermit, setIsPermitsDisabled: vi.fn(), isPermitsDisabled: false },
      setIsApproving: vi.fn(),
      metric: { flow: "trade", isExpress: true },
    });
  }

  function getOutcomes() {
    return getApprovalEvents().map(({ data }) => `${data.method}:${data.outcome}`);
  }

  it("reports a signed permit without a transaction", async () => {
    await approveWithPermit(async () => undefined);

    expect(getOutcomes()).toEqual(["permit:accepted"]);
  });

  it("reports a rejected permit and stops", async () => {
    await approveWithPermit(async () => {
      throw new Error("User rejected the request.");
    });

    expect(getOutcomes()).toEqual(["permit:rejected"]);
  });

  it("reports a failed permit and the approval transaction that replaces it", async () => {
    await approveWithPermit(async () => {
      throw new Error("Unknown connector error");
    });

    expect(getOutcomes()).toEqual(["permit:failed", "transaction:accepted"]);
  });
});
