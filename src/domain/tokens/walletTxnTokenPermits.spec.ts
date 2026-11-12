import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SignedTokenPermit } from "sdk/utils/tokens/types";

import { TokenPermitsCheckError } from "./checkTokenPermits";
import { prepareWalletTxnTokenPermits, sendWithWalletTxnTokenPermits } from "./walletTxnTokenPermits";

const mocks = vi.hoisted(() => ({ getWalletTxnTokenPermits: vi.fn(), toastError: vi.fn() }));

vi.mock("./checkTokenPermitsBeforeSend", () => ({ getWalletTxnTokenPermits: mocks.getWalletTxnTokenPermits }));
vi.mock("lib/helperToast", () => ({ helperToast: { error: mocks.toastError } }));
vi.mock("components/Errors/errorToasts", () => ({ getInvalidPermitSignatureToastContent: () => "permit failed" }));

const ARBITRUM = 42161;
const VAULT = "0x0000000000000000000000000000000000000009";
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const GM = "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336";

const usdcPermit = { token: USDC, r: "0x1" } as SignedTokenPermit;

function makeWalletTxnTokenPermits(tokenPermits: SignedTokenPermit[] = [usdcPermit]) {
  return {
    tokenPermits,
    removeTokenPermits: vi.fn(),
    forgetSentTokenPermits: vi.fn(),
    getTokenPermitsExecutedHandler: vi.fn(() => () => undefined),
    handleTokenPermitsError: vi.fn(),
  };
}

describe("prepareWalletTxnTokenPermits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("checks the permits against what the multicall's sendTokens calls pull, summed per token", async () => {
    mocks.getWalletTxnTokenPermits.mockResolvedValue({ validPermits: [usdcPermit], stalePermits: [] });

    const permits = await prepareWalletTxnTokenPermits({
      chainId: ARBITRUM,
      walletTxnTokenPermits: makeWalletTxnTokenPermits(),
      multicall: [
        { method: "sendWnt", params: [VAULT, 1n] },
        { method: "sendTokens", params: [USDC, VAULT, 100n] },
        undefined,
        { method: "sendTokens", params: [USDC, VAULT, 50n] },
        { method: "sendTokens", params: [GM, VAULT, 7n] },
        { method: "createDeposit", params: [{}] },
      ],
    });

    expect(permits).toEqual([usdcPermit]);
    expect(mocks.getWalletTxnTokenPermits).toHaveBeenCalledWith(
      expect.objectContaining({ requiredAmounts: { [USDC]: 150n, [GM]: 7n } })
    );
  });

  it("leaves out and forgets a permit the allowance already covers", async () => {
    mocks.getWalletTxnTokenPermits.mockResolvedValue({ validPermits: [], stalePermits: [usdcPermit] });
    const walletTxnTokenPermits = makeWalletTxnTokenPermits();

    const permits = await prepareWalletTxnTokenPermits({
      chainId: ARBITRUM,
      walletTxnTokenPermits,
      multicall: [{ method: "sendTokens", params: [USDC, VAULT, 100n] }],
    });

    expect(permits).toEqual([]);
    expect(walletTxnTokenPermits.removeTokenPermits).toHaveBeenCalledWith([usdcPermit]);
  });

  it("stops the send and sends the token back to approvals when a permit fails the check", async () => {
    const error = new TokenPermitsCheckError([usdcPermit]);
    mocks.getWalletTxnTokenPermits.mockRejectedValue(error);
    const walletTxnTokenPermits = makeWalletTxnTokenPermits();

    await expect(
      prepareWalletTxnTokenPermits({
        chainId: ARBITRUM,
        walletTxnTokenPermits,
        multicall: [{ method: "sendTokens", params: [USDC, VAULT, 100n] }],
      })
    ).rejects.toBe(error);

    expect(walletTxnTokenPermits.handleTokenPermitsError).toHaveBeenCalledWith(error, []);
    expect(mocks.toastError).toHaveBeenCalledWith("permit failed");
  });

  it("checks nothing without stored permits", async () => {
    const permits = await prepareWalletTxnTokenPermits({
      chainId: ARBITRUM,
      walletTxnTokenPermits: makeWalletTxnTokenPermits([]),
      multicall: [{ method: "sendTokens", params: [USDC, VAULT, 100n] }],
    });

    expect(permits).toEqual([]);
    expect(mocks.getWalletTxnTokenPermits).not.toHaveBeenCalled();
  });
});

describe("sendWithWalletTxnTokenPermits", () => {
  it("forgets the sent permits once the transaction is out, and reports them from the pending transaction", async () => {
    const walletTxnTokenPermits = makeWalletTxnTokenPermits();
    const send = vi.fn(async () => "sent");

    await expect(
      sendWithWalletTxnTokenPermits({ walletTxnTokenPermits, tokenPermits: [usdcPermit], send })
    ).resolves.toBe("sent");

    expect(walletTxnTokenPermits.getTokenPermitsExecutedHandler).toHaveBeenCalledWith([usdcPermit]);
    expect(send).toHaveBeenCalledWith(expect.any(Function));
    expect(walletTxnTokenPermits.forgetSentTokenPermits).toHaveBeenCalledWith([usdcPermit]);
  });

  it("keeps the permits and hands the error to the permit handler when the send fails", async () => {
    const walletTxnTokenPermits = makeWalletTxnTokenPermits();
    const error = new Error("ExternalCallFailed");

    await expect(
      sendWithWalletTxnTokenPermits({
        walletTxnTokenPermits,
        tokenPermits: [usdcPermit],
        send: () => Promise.reject(error),
      })
    ).rejects.toBe(error);

    expect(walletTxnTokenPermits.forgetSentTokenPermits).not.toHaveBeenCalled();
    expect(walletTxnTokenPermits.handleTokenPermitsError).toHaveBeenCalledWith(error, [usdcPermit], {
      isAnyContext: true,
    });
  });

  it("sends without a pending transaction hook when no permit goes in", async () => {
    const walletTxnTokenPermits = makeWalletTxnTokenPermits();
    const send = vi.fn(async () => "sent");

    await sendWithWalletTxnTokenPermits({ walletTxnTokenPermits, tokenPermits: [], send });

    expect(send).toHaveBeenCalledWith(undefined);
    expect(walletTxnTokenPermits.forgetSentTokenPermits).not.toHaveBeenCalled();
  });
});
