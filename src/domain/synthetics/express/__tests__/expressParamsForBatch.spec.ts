import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import type { ExpressTxnParams } from "domain/synthetics/express";
import { EXPRESS_EXTERNAL_CALLS_MISMATCH_ERROR } from "lib/errors/customErrors";
import { expandDecimals, USD_DECIMALS } from "lib/numbers";
import type { WalletSigner } from "lib/wallets";
import { getContract } from "sdk/configs/contracts";
import { getTokenBySymbol, getWrappedToken } from "sdk/configs/tokens";
import { mockExternalSwap } from "sdk/test/mock";
import { getRawRelayerParams } from "sdk/utils/express";
import { OrderType } from "sdk/utils/orders/types";
import {
  type BatchOrderTxnParams,
  buildIncreaseOrderPayload,
  getBatchExternalCalls,
} from "sdk/utils/orderTransactions";

import { buildAndSignExpressBatchOrderTxn } from "../expressOrderUtils";
import { getMatchingExpressParamsPromise } from "../useRelayerFeeHandler";

const ACCOUNT = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const ETH_MARKET = "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336";
const USDC_USDT_MARKET = "0xB686BcB112660343E6d15BDb65297e110C8311c4";
const USDC = getTokenBySymbol(ARBITRUM, "USDC");
const USDT = getTokenBySymbol(ARBITRUM, "USDT");
const WETH = getWrappedToken(ARBITRUM);

// the reporter's case: 3,000 USDT goes through KyberSwap, 500 USDT through the GMX pool
function makeBatch(payUsd: number, route: "kyberSwap" | "pool"): BatchOrderTxnParams {
  const payTokenAmount = expandDecimals(payUsd, USDT.decimals);

  return {
    createOrderParams: [
      buildIncreaseOrderPayload({
        chainId: ARBITRUM,
        receiver: ACCOUNT,
        executionFeeAmount: expandDecimals(1, 14),
        executionGasLimit: 3_000_000n,
        referralCode: undefined,
        uiFeeReceiver: undefined,
        allowedSlippage: 30,
        autoCancel: false,
        validFromTime: undefined,
        marketAddress: ETH_MARKET,
        indexTokenAddress: WETH.address,
        isLong: true,
        sizeDeltaUsd: expandDecimals(payUsd * 2, USD_DECIMALS),
        sizeDeltaInTokens: expandDecimals(payUsd * 2, WETH.decimals) / 3000n,
        acceptablePrice: expandDecimals(3000, USD_DECIMALS),
        triggerPrice: undefined,
        payTokenAddress: USDT.address,
        payTokenAmount,
        swapPath: route === "pool" ? [USDC_USDT_MARKET] : [],
        collateralDeltaAmount: expandDecimals(payUsd, USDC.decimals),
        collateralTokenAddress: USDC.address,
        externalSwapQuote:
          route === "kyberSwap"
            ? mockExternalSwap({
                inToken: USDT,
                outToken: USDC,
                amountIn: payTokenAmount,
                amountOut: expandDecimals(payUsd, USDC.decimals),
                priceIn: expandDecimals(1, USD_DECIMALS),
                priceOut: expandDecimals(1, USD_DECIMALS),
                receiver: getContract(ARBITRUM, "OrderVault"),
              })
            : undefined,
        orderType: OrderType.MarketIncrease,
      }),
    ],
    updateOrderParams: [],
    cancelOrderParams: [],
  };
}

function makeExpressParams(estimatedBatch: BatchOrderTxnParams): ExpressTxnParams {
  return {
    isGmxAccount: false,
    relayParamsPayload: getRawRelayerParams({
      chainId: ARBITRUM,
      gasPaymentTokenAddress: USDC.address,
      relayerFeeTokenAddress: WETH.address,
      feeParams: { feeToken: USDC.address, feeAmount: expandDecimals(1, USDC.decimals), feeSwapPath: [ETH_MARKET] },
      externalCalls: getBatchExternalCalls(estimatedBatch),
      tokenPermits: [],
    }),
    gasPaymentParams: { relayerFeeTokenAddress: WETH.address, relayerFeeAmount: expandDecimals(1, 14) },
  } as ExpressTxnParams;
}

const kyberSwap3000 = makeBatch(3000, "kyberSwap");
const kyberSwap2000 = makeBatch(2000, "kyberSwap");
const pool500 = makeBatch(500, "pool");

describe("Express params estimated for another order TRD-39", () => {
  it.each([
    { name: "its own batch", estimatedBatch: kyberSwap3000, batch: kyberSwap3000, isSigned: true },
    { name: "KyberSwap 3000 -> pool 500", estimatedBatch: kyberSwap3000, batch: pool500, isSigned: false },
    { name: "KyberSwap 3000 -> KyberSwap 2000", estimatedBatch: kyberSwap3000, batch: kyberSwap2000, isSigned: false },
    { name: "pool 500 -> KyberSwap 3000", estimatedBatch: pool500, batch: kyberSwap3000, isSigned: false },
  ])(
    "signs relay params only for the batch they were estimated for: $name",
    async ({ estimatedBatch, batch, isSigned }) => {
      const expressParams = makeExpressParams(estimatedBatch);

      const txn = buildAndSignExpressBatchOrderTxn({
        chainId: ARBITRUM,
        batchParams: batch,
        relayParamsPayload: expressParams.relayParamsPayload,
        relayerFeeTokenAddress: expressParams.gasPaymentParams.relayerFeeTokenAddress,
        relayerFeeAmount: expressParams.gasPaymentParams.relayerFeeAmount,
        subaccount: undefined,
        signer: { address: ACCOUNT } as WalletSigner,
        isGmxAccount: false,
        emptySignature: true,
      });

      if (isSigned) {
        await expect(txn).resolves.toMatchObject({ to: getContract(ARBITRUM, "GelatoRelayRouter") });
      } else {
        await expect(txn).rejects.toThrow(EXPRESS_EXTERNAL_CALLS_MISMATCH_ERROR);
      }
    }
  );

  it.each([
    {
      name: "old swap first, edited order later",
      fast: () => Promise.resolve(makeExpressParams(kyberSwap3000)),
      async: () =>
        new Promise<ExpressTxnParams>((resolve) => setTimeout(() => resolve(makeExpressParams(pool500)), 10)),
      expected: pool500,
    },
    {
      name: "old swap only",
      fast: () => Promise.resolve(makeExpressParams(kyberSwap3000)),
      async: () => Promise.resolve(makeExpressParams(kyberSwap3000)),
      expected: undefined,
    },
  ])("submits only the estimate made for the edited order: $name", async ({ fast, async, expected }) => {
    const expressParams = await getMatchingExpressParamsPromise({
      fastExpressPromise: fast(),
      asyncExpressPromise: async(),
      isAsyncEnabled: true,
      isGmxAccount: false,
      batchExternalCalls: getBatchExternalCalls(pool500),
    });

    expect(expressParams?.relayParamsPayload.externalCalls).toEqual(
      expected ? getBatchExternalCalls(expected) : undefined
    );
  });
});
