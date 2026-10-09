import { encodeFunctionResult, erc20Abi } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import type { ExpressTxnParams } from "domain/synthetics/express";
import { TokenPermitsCheckError } from "domain/tokens/checkTokenPermits";
import type { WalletSigner } from "lib/wallets";
import { abis } from "sdk/abis";
import type { BatchOrderTxnParams } from "sdk/utils/orderTransactions";
import type { SignedTokenPermit } from "sdk/utils/tokens/types";

import { sendBatchOrderTxn } from "../sendBatchOrderTxn";

const mocks = vi.hoisted(() => ({
  call: vi.fn(),
  buildAndSign: vi.fn(),
  sendExpressTransaction: vi.fn(),
  pushError: vi.fn(),
}));

vi.mock("lib/wallets/walletConfig", () => ({ getPublicClientWithRpc: () => ({ call: mocks.call }) }));
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

function mockCheck(results: { permitOk: boolean; allowance: bigint }[]) {
  mocks.call.mockResolvedValue({
    data: encodeFunctionResult({
      abi: abis.Multicall,
      functionName: "aggregate3",
      result: results.flatMap(({ permitOk, allowance }) => [
        { success: permitOk, returnData: "0x" as `0x${string}` },
        {
          success: true,
          returnData: encodeFunctionResult({
            abi: erc20Abi,
            functionName: "allowance",
            result: allowance,
          }) as `0x${string}`,
        },
      ]),
    }),
  });
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

  it("relays a permit that covers the pay amount plus the relay fee", async () => {
    const usdcPermit = permit(USDC, 110n);
    mockCheck([{ permitOk: true, allowance: 110n }]);

    await send(makeExpressParams([usdcPermit]), makeBatchParams(100n));

    expect(mocks.call).toHaveBeenCalledTimes(1);
    expect(getSentPermits()).toEqual([usdcPermit]);
    expect(mocks.sendExpressTransaction).toHaveBeenCalledTimes(1);
  });

  it("checks permits on update and cancel batches against the relay fee", async () => {
    const usdcPermit = permit(USDC, 5n);
    mockCheck([{ permitOk: true, allowance: 5n }]);
    const callback = vi.fn();

    await expect(send(makeExpressParams([usdcPermit]), makeBatchParams(), callback)).rejects.toBeInstanceOf(
      TokenPermitsCheckError
    );
    expect(mocks.sendExpressTransaction).not.toHaveBeenCalled();
  });

  it("sends nothing and reports the failed permits when the allowance would stay short", async () => {
    const usdcPermit = permit(USDC, 110n);
    mockCheck([{ permitOk: false, allowance: 0n }]);
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
    mockCheck([{ permitOk: false, allowance: 1000n }]);
    const callback = vi.fn();

    await send(makeExpressParams([usdcPermit]), makeBatchParams(100n), callback);

    expect(getSentPermits()).toEqual([]);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ event: "Submitted", data: expect.objectContaining({ stalePermits: [usdcPermit] }) })
    );
  });

  it("still sends when the check itself can't reach the rpc", async () => {
    const usdcPermit = permit(USDC, 110n);
    mocks.call.mockRejectedValue(new Error("rpc down"));

    await send(makeExpressParams([usdcPermit]), makeBatchParams(100n));

    expect(mocks.pushError).toHaveBeenCalledWith(expect.any(Error), "expressOrders.tokenPermitsCheck");
    expect(getSentPermits()).toEqual([usdcPermit]);
  });

  it("skips the check when the relay call carries no permits", async () => {
    await send(makeExpressParams([]), makeBatchParams(100n));

    expect(mocks.call).not.toHaveBeenCalled();
    expect(mocks.sendExpressTransaction).toHaveBeenCalledTimes(1);
  });
});
