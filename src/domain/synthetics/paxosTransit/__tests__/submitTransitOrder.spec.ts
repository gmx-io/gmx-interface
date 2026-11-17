import { encodeFunctionData, erc20Abi } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import type { WalletSigner } from "lib/wallets";
import { AccountType } from "lib/wallets/useAccountType";
import type { TransitQuote, TransitQuoteParams } from "sdk/utils/paxos/types";

import {
  submitTransitOrder,
  TransitApprovalClaimedError,
  TransitApprovalPendingError,
  TransitConversionPendingError,
} from "../submitTransitOrder";
import {
  getIsTransitApprovalProposed,
  storeTransitApprovalProposal,
  storeTransitConversionProposal,
} from "../transitWalletProposals";
import type { TransitApi } from "../types";

const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const USDG = "0x004B506865409877C9fA29bfb1ebA929984B9bbC";
const STATION = "0x49AAA987b1a7e9E4AE091dcD8332c39F322D7d28";
const SAFE = "0x2c2f76429EAB8E2730BE4085dcdd9370B8D1a96c";
const AMOUNT = 200_000_000n;

const chain = vi.hoisted(() => ({
  now: 0,
  accountType: 0,
  allowances: [] as bigint[],
  sentTxns: [] as { to: string; callData: string }[],
  waitedTxns: 0,
  isApprovalRejected: false,
  stationGate: undefined as Promise<void> | undefined,
}));

vi.mock("lib/wallets/useAccountType", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getAccountType: async () => chain.accountType,
}));
vi.mock("lib/wallets/walletConfig", () => ({
  getPublicClientWithRpc: () => ({
    readContract: async () => {
      chain.now += 3_000;
      return chain.allowances.shift() ?? 0n;
    },
  }),
}));
vi.mock("lib/sleep", () => ({ sleep: async () => undefined }));
vi.mock("domain/tokens/tokenApprovalMetric", () => ({ sendTokenApprovalMetric: () => undefined }));
vi.mock("../transitOrders", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSubmittedTransitOrderId: async () => "0xorder",
}));
vi.mock("lib/transactions/sendWalletTransaction", () => ({
  sendWalletTransaction: async (p: { to: string; callData: string }) => {
    if (chain.isApprovalRejected && p.to === USDC) {
      throw Object.assign(new Error("user rejected action"), { code: 4001 });
    }

    chain.sentTxns.push({ to: p.to, callData: p.callData });

    if (p.to === STATION && chain.stationGate) {
      await chain.stationGate;
    }

    return {
      transactionHash: "0xhash",
      wait: async () => {
        chain.waitedTxns += 1;
        return { transactionHash: "0xhash", blockNumber: 1, status: "success" };
      },
    };
  },
}));

const params: TransitQuoteParams = {
  userAddress: SAFE,
  offerAsset: USDC,
  wantAsset: USDG,
  offerAmount: AMOUNT,
  sourceChainId: ARBITRUM,
  destinationChainId: ARBITRUM,
  feeTier: "standardFee",
};

const quote = { transaction: { to: STATION, data: "0xsubmit", value: 0n } } as unknown as TransitQuote;
const approveData = encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [STATION, AMOUNT] });

function makeApi(alreadyApproved: boolean) {
  return {
    fetchTransitQuote: async () => quote,
    fetchTransitOrders: async () => ({ orders: [{ id: "0xold" }], nextPageToken: undefined }),
    fetchTransitAuthorization: async () => ({
      spenderAddress: STATION,
      alreadyApproved,
      methods: [{ type: "erc20_approve", transaction: { encoded: approveData } }],
    }),
  } as unknown as TransitApi;
}

const submit = (api: TransitApi, validateSubmitQuote?: () => void) =>
  submitTransitOrder({
    api,
    chainId: ARBITRUM,
    signer: {} as WalletSigner,
    account: SAFE,
    params,
    isMocked: false,
    onStep: () => undefined,
    validateSubmitQuote,
  });

describe("submitTransitOrder", () => {
  beforeEach(() => {
    chain.now = Date.parse("2026-10-14T13:00:00Z");
    vi.spyOn(Date, "now").mockImplementation(() => chain.now);
    chain.allowances = [];
    chain.sentTxns = [];
    chain.waitedTxns = 0;
    chain.isApprovalRejected = false;
    chain.stationGate = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("a smart account proposes the approval once, waits for the allowance and finds the order later", async () => {
    chain.accountType = AccountType.SmartAccount;
    chain.allowances = [0n, 0n, AMOUNT];

    const conversion = await submit(makeApi(false));

    expect(chain.sentTxns.map((txn) => txn.to)).toEqual([USDC, STATION]);
    expect(chain.waitedTxns).toBe(0);
    expect(conversion).toMatchObject({
      orderId: undefined,
      txnHash: undefined,
      offerAmount: AMOUNT,
      knownOrderIds: ["0xold"],
    });
    expect(conversion.submittedAt).toEqual(expect.any(Number));
  });

  it("two flows waiting for the same approval send one conversion", async () => {
    chain.accountType = AccountType.SmartAccount;
    chain.allowances = [0n, 0n, AMOUNT, AMOUNT];
    storeTransitApprovalProposal({
      chainId: ARBITRUM,
      account: SAFE,
      tokenAddress: USDC,
      spender: STATION,
      amount: AMOUNT,
    });

    const results = await Promise.allSettled([submit(makeApi(false)), submit(makeApi(false))]);

    expect(chain.sentTxns.map((txn) => txn.to)).toEqual([STATION]);
    expect(results.map((result) => result.status).sort()).toEqual(["fulfilled", "rejected"]);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({
      reason: expect.any(TransitApprovalClaimedError),
    });
  });

  it("a click that finds the approval already executed cancels a flow still waiting for it", async () => {
    chain.accountType = AccountType.SmartAccount;
    chain.allowances = [0n, 0n, 0n, AMOUNT];

    const waiting = submit(makeApi(false));
    const executed = submit(makeApi(true));
    const results = await Promise.allSettled([waiting, executed]);

    expect(chain.sentTxns.filter((txn) => txn.to === STATION)).toHaveLength(1);
    expect(results[0]).toMatchObject({ status: "rejected", reason: expect.any(TransitApprovalClaimedError) });
    expect(results[1]).toMatchObject({ status: "fulfilled" });
  });

  it("a flow cancelled while waiting stops before the new quote, without the quote error", async () => {
    chain.accountType = AccountType.SmartAccount;
    chain.allowances = [0n, 0n, 0n, AMOUNT];

    const waiting = submit(makeApi(false), () => {
      throw new Error("quote changed");
    });
    const executed = submit(makeApi(true));
    const results = await Promise.allSettled([waiting, executed]);

    expect(results[0]).toMatchObject({ status: "rejected", reason: expect.any(TransitApprovalClaimedError) });
  });

  it.each([
    ["with browser storage", false],
    ["without browser storage", true],
  ])(
    "a click while the wallet still holds the conversion does not send another one, %s",
    async (_name, isStorageOff) => {
      chain.accountType = AccountType.SmartAccount;
      let openGate = () => undefined as void;
      chain.stationGate = new Promise((resolve) => (openGate = resolve));

      if (isStorageOff) {
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
          throw new Error("storage is not available");
        });
      }

      const first = submit(makeApi(true));
      await vi.waitFor(() => expect(chain.sentTxns).toHaveLength(1));
      const second = submit(makeApi(true));

      await expect(second).rejects.toBeInstanceOf(TransitConversionPendingError);
      openGate();
      await first;

      expect(chain.sentTxns.map((txn) => txn.to)).toEqual([STATION]);
    }
  );

  it("a conversion sent from another tab blocks a new one until it executes", async () => {
    chain.accountType = AccountType.SmartAccount;
    storeTransitConversionProposal({ chainId: ARBITRUM, account: SAFE });

    await expect(submit(makeApi(true))).rejects.toBeInstanceOf(TransitConversionPendingError);

    expect(chain.sentTxns).toEqual([]);
  });

  it("without browser storage a single flow still sends its conversion", async () => {
    chain.accountType = AccountType.SmartAccount;
    chain.allowances = [0n, AMOUNT];
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage is not available");
    });

    await submit(makeApi(false));

    expect(chain.sentTxns.map((txn) => txn.to)).toEqual([USDC, STATION]);
  });

  it("a rejected approval leaves nothing behind, so the next click proposes it again", async () => {
    chain.accountType = AccountType.SmartAccount;
    chain.isApprovalRejected = true;

    await expect(submit(makeApi(false))).rejects.toThrow("user rejected action");

    expect(
      getIsTransitApprovalProposed({
        chainId: ARBITRUM,
        account: SAFE,
        tokenAddress: USDC,
        spender: STATION,
        amount: AMOUNT,
      })
    ).toBe(false);
  });

  it("a smart account retry does not propose another approval while the first one waits in the queue", async () => {
    chain.accountType = AccountType.SmartAccount;

    await expect(submit(makeApi(false))).rejects.toBeInstanceOf(TransitApprovalPendingError);
    chain.allowances = [AMOUNT];
    await submit(makeApi(false));

    expect(chain.sentTxns.map((txn) => txn.to)).toEqual([USDC, STATION]);
  });

  it("a regular wallet still waits for both receipts and reads the order id from the submit receipt", async () => {
    chain.accountType = AccountType.EOA;

    const conversion = await submit(makeApi(false));

    expect(chain.sentTxns.map((txn) => txn.to)).toEqual([USDC, STATION]);
    expect(chain.waitedTxns).toBe(2);
    expect(conversion).toMatchObject({ orderId: "0xorder", txnHash: "0xhash" });
  });
});
