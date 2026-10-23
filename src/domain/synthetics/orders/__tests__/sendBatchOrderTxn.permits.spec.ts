import { beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import type { ExpressTxnParams } from "domain/synthetics/express";
import { TokenPermitsCheckError, type TokenPermitsCheckResult } from "domain/tokens/checkTokenPermits";
import type { WalletSigner } from "lib/wallets";
import type { BatchOrderTxnParams } from "sdk/utils/orderTransactions";
import type { SignedTokenPermit } from "sdk/utils/tokens/types";

import { sendBatchOrderTxn } from "../sendBatchOrderTxn";

const mocks = vi.hoisted(() => ({
  checkTokenPermits: vi.fn(),
  buildAndSign: vi.fn(),
  sendExpressTransaction: vi.fn(),
  pushError: vi.fn(),
}));

vi.mock("lib/wallets/walletConfig", () => ({ getPublicClientWithRpc: () => ({}) }));
vi.mock("domain/tokens/checkTokenPermits", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  checkTokenPermits: mocks.checkTokenPermits,
}));
vi.mock("domain/synthetics/express/expressOrderUtils", () => ({
  buildAndSignExpressBatchOrderTxn: mocks.buildAndSign,
}));
vi.mock("lib/transactions/sendExpressTransaction", () => ({ sendExpressTransaction: mocks.sendExpressTransaction }));
vi.mock("lib/metrics", () => ({ metrics: { pushError: mocks.pushError } }));
vi.mock("../jitOrderUtils", () => ({
  encodeJitBatchOrderMetadata: (batchParams: BatchOrderTxnParams) => batchParams,
  getNeedsJitOrder: () => false,
  isJitShiftError: () => false,
}));

const OWNER = "0x0000000000000000000000000000000000000001";
const ROUTER = "0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6";
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const WETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";

function permit(token: string, value: bigint): SignedTokenPermit {
  return {
    token,
    owner: OWNER,
    spender: ROUTER,
    value,
    deadline: 2000000000n,
    v: 27,
    r: `0x${"11".repeat(32)}`,
    s: `0x${"22".repeat(32)}`,
    onchainParams: { name: "Token", version: "1", nonce: 0n },
  };
}

function makeExpressParams(tokenPermits: SignedTokenPermit[]): ExpressTxnParams {
  return {
    isGmxAccount: false,
    subaccount: undefined,
    relayParamsPayload: { tokenPermits },
    gasPaymentParams: {
      gasPaymentTokenAddress: USDC,
      gasPaymentTokenAmount: 10n,
      relayerFeeTokenAddress: WETH,
      relayerFeeAmount: 1n,
    },
  } as unknown as ExpressTxnParams;
}

function makeBatchParams(payAmount?: bigint): BatchOrderTxnParams {
  return {
    createOrderParams:
      payAmount === undefined ? [] : [{ tokenTransfersParams: { payTokenAddress: USDC, payTokenAmount: payAmount } }],
    updateOrderParams: [],
    cancelOrderParams: [],
  } as unknown as BatchOrderTxnParams;
}

function mockCheck(result: Partial<TokenPermitsCheckResult>) {
  mocks.checkTokenPermits.mockResolvedValue({ validPermits: [], stalePermits: [], failedPermits: [], ...result });
}

function send(expressParams: ExpressTxnParams, batchParams: BatchOrderTxnParams, callback = vi.fn()) {
  return sendBatchOrderTxn({
    chainId: ARBITRUM,
    signer: { address: OWNER } as WalletSigner,
    isGmxAccount: false,
    provider: {} as any,
    batchParams,
    expressParams,
    simulationParams: undefined,
    callback,
  });
}

function getSentPermits() {
  return mocks.buildAndSign.mock.calls[0][0].relayParamsPayload.tokenPermits;
}

describe("sendBatchOrderTxn pre-send permit check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.buildAndSign.mockResolvedValue({ callData: "0x", to: ROUTER, feeToken: WETH, feeAmount: 1n });
    mocks.sendExpressTransaction.mockResolvedValue({ taskId: "task" });
  });

  it.each([
    { name: "the pay amount plus the relay fee", payAmount: 100n, required: 110n },
    { name: "the relay fee on update and cancel batches", payAmount: undefined, required: 10n },
  ])("relays a permit checked against $name", async ({ payAmount, required }) => {
    const usdcPermit = permit(USDC, 110n);
    mockCheck({ validPermits: [usdcPermit] });

    await send(makeExpressParams([usdcPermit]), makeBatchParams(payAmount));

    expect(mocks.checkTokenPermits).toHaveBeenCalledWith(
      expect.objectContaining({ permits: [usdcPermit], requiredAmounts: { [USDC]: required } })
    );
    expect(getSentPermits()).toEqual([usdcPermit]);
    expect(mocks.sendExpressTransaction).toHaveBeenCalledTimes(1);
  });

  it("sends nothing and reports the failed permits when the allowance would stay short", async () => {
    const usdcPermit = permit(USDC, 110n);
    mockCheck({ failedPermits: [usdcPermit] });
    const callback = vi.fn();

    const error = await send(makeExpressParams([usdcPermit]), makeBatchParams(100n), callback).catch((e) => e);

    expect(error).toBeInstanceOf(TokenPermitsCheckError);
    expect(error.failedPermits).toEqual([usdcPermit]);
    expect(mocks.buildAndSign).not.toHaveBeenCalled();
    expect(mocks.sendExpressTransaction).not.toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ event: "Error" }));
    expect(callback).not.toHaveBeenCalledWith(expect.objectContaining({ event: "Submitted" }));
  });

  it("drops a stale permit from the relay call when the allowance already covers the spend", async () => {
    const usdcPermit = permit(USDC, 110n);
    mockCheck({ stalePermits: [usdcPermit] });
    const callback = vi.fn();

    await send(makeExpressParams([usdcPermit]), makeBatchParams(100n), callback);

    expect(getSentPermits()).toEqual([]);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ event: "Submitted", data: expect.objectContaining({ stalePermits: [usdcPermit] }) })
    );
  });

  it("still sends when the check itself can't reach the rpc", async () => {
    const usdcPermit = permit(USDC, 110n);
    mocks.checkTokenPermits.mockRejectedValue(new Error("rpc down"));

    await send(makeExpressParams([usdcPermit]), makeBatchParams(100n));

    expect(mocks.pushError).toHaveBeenCalledWith(expect.any(Error), "expressOrders.tokenPermitsCheck");
    expect(getSentPermits()).toEqual([usdcPermit]);
  });
});
