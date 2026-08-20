import { describe, expect, it } from "vitest";

import { OrderType } from "domain/synthetics/orders";
import { expandDecimals } from "lib/numbers";
import { ARBITRUM } from "sdk/configs/chains";
import { MARKETS } from "sdk/configs/markets";
import { getTokenBySymbol, getWrappedToken } from "sdk/configs/tokens";
import {
  BatchOrderTxnParams,
  CreateOrderTxnParams,
  getIsEmptyBatch,
  IncreasePositionOrderParams,
} from "sdk/utils/orderTransactions";
import { convertToContractPrice } from "sdk/utils/tokens";
import { applySlippageToPrice } from "sdk/utils/trade";

import { buildMarginDepositBatchParams, MarginDepositBatchParams } from "../marginDepositBatchParams";

const CHAIN_ID = ARBITRUM;
const ACCOUNT = "0x1234567890123456789012345678901234567890";
const USDC = getTokenBySymbol(CHAIN_ID, "USDC");
const WETH = getWrappedToken(CHAIN_ID);
const ETH_MARKET = MARKETS[CHAIN_ID]["0x70d95587d40A2caf56bd97485aB3Eec10Bee6336"];

const ALLOWED_SLIPPAGE = 50;
const TRIGGER_PRICE = expandDecimals(2000, 30);
const DEPOSIT_AMOUNT = expandDecimals(500, USDC.decimals);

const commonParams: MarginDepositBatchParams = {
  chainId: CHAIN_ID,
  receiver: ACCOUNT,
  executionFeeAmount: expandDecimals(1, 15),
  executionGasLimit: 1_000_000n,
  referralCode: undefined,
  collateralTokenAddress: USDC.address,
  collateralDeltaAmount: DEPOSIT_AMOUNT,
  triggerPrice: TRIGGER_PRICE,
  isLong: true,
  marketAddress: ETH_MARKET.marketTokenAddress,
  indexTokenAddress: WETH.address,
  allowedSlippage: ALLOWED_SLIPPAGE,
  replacingOrderKey: undefined,
};

function getCreateOrder(batchParams: BatchOrderTxnParams) {
  return batchParams.createOrderParams[0] as CreateOrderTxnParams<IncreasePositionOrderParams>;
}

describe("buildMarginDepositBatchParams", () => {
  it("creates a single zero-size Limit Increase with mandatory auto-cancel", () => {
    const batchParams = buildMarginDepositBatchParams(commonParams);

    expect(batchParams.createOrderParams).toHaveLength(1);
    expect(batchParams.updateOrderParams).toEqual([]);

    const { orderPayload, params } = getCreateOrder(batchParams);

    expect(orderPayload.orderType).toBe(OrderType.LimitIncrease);
    expect(orderPayload.numbers.sizeDeltaUsd).toBe(0n);
    expect(params.sizeDeltaInTokens).toBe(0n);
    expect(orderPayload.autoCancel).toBe(true);
    expect(orderPayload.numbers.validFromTime).toBe(0n);
    expect(orderPayload.isLong).toBe(true);
    expect(orderPayload.addresses.market).toBe(ETH_MARKET.marketTokenAddress);
  });

  it("deposits the position collateral token without swaps or external swaps", () => {
    const { orderPayload, params } = getCreateOrder(buildMarginDepositBatchParams(commonParams));

    expect(orderPayload.addresses.swapPath).toEqual([]);
    expect(orderPayload.addresses.initialCollateralToken).toBe(USDC.address);
    expect(orderPayload.numbers.initialCollateralDeltaAmount).toBe(DEPOSIT_AMOUNT);
    expect(params.payTokenAddress).toBe(USDC.address);
    expect(params.collateralTokenAddress).toBe(USDC.address);
    expect(params.externalSwapQuote).toBeUndefined();
  });

  it("is not treated as an empty batch despite the zero size delta", () => {
    expect(getIsEmptyBatch(buildMarginDepositBatchParams(commonParams))).toBe(false);
  });

  it("sets the trigger price and derives the acceptable price from it", () => {
    const { orderPayload } = getCreateOrder(buildMarginDepositBatchParams(commonParams));

    expect(orderPayload.numbers.triggerPrice).toBe(convertToContractPrice(TRIGGER_PRICE, WETH.decimals));
    expect(orderPayload.numbers.acceptablePrice).toBe(
      convertToContractPrice(applySlippageToPrice(ALLOWED_SLIPPAGE, TRIGGER_PRICE, true, true), WETH.decimals)
    );
    expect(orderPayload.numbers.acceptablePrice > orderPayload.numbers.triggerPrice).toBe(true);
  });

  it("moves the acceptable price down for a short", () => {
    const { orderPayload } = getCreateOrder(
      buildMarginDepositBatchParams({
        ...commonParams,
        isLong: false,
      })
    );

    expect(orderPayload.numbers.acceptablePrice).toBe(
      convertToContractPrice(applySlippageToPrice(ALLOWED_SLIPPAGE, TRIGGER_PRICE, true, false), WETH.decimals)
    );
    expect(orderPayload.numbers.acceptablePrice < orderPayload.numbers.triggerPrice).toBe(true);
  });

  it("does not cancel anything when no order is being replaced", () => {
    expect(buildMarginDepositBatchParams(commonParams).cancelOrderParams).toEqual([]);
  });

  it("cancels the replaced order in the same batch", () => {
    const batchParams = buildMarginDepositBatchParams({
      ...commonParams,
      replacingOrderKey: "0xorderkey",
    });

    expect(batchParams.cancelOrderParams).toEqual([{ orderKey: "0xorderkey" }]);
    expect(batchParams.createOrderParams).toHaveLength(1);
  });
});
