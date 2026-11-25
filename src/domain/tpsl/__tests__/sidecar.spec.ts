// @vitest-shared-worker
import { describe, expect, it } from "vitest";

import { DecreasePositionSwapType, OrderType, PositionOrderInfo } from "domain/synthetics/orders";
import { DecreasePositionAmounts } from "domain/synthetics/trade";
import { expandDecimals, MaxUint256 } from "lib/numbers";
import { ARBITRUM } from "sdk/configs/chains";
import { MARKETS } from "sdk/configs/markets";
import { getTokenBySymbol, getWrappedToken } from "sdk/configs/tokens";

import { buildTpSlBatchPayloads } from "../sidecar";

const CHAIN_ID = ARBITRUM;
const ACCOUNT = "0x1234567890123456789012345678901234567890";
const ETH_MARKET = MARKETS[CHAIN_ID]["0x70d95587d40A2caf56bd97485aB3Eec10Bee6336"];
const USDC = getTokenBySymbol(CHAIN_ID, "USDC");
const WETH = getWrappedToken(CHAIN_ID);

function makeAmounts(overrides: Partial<DecreasePositionAmounts>): DecreasePositionAmounts {
  return {
    isFullClose: false,
    sizeDeltaUsd: expandDecimals(1000, 30),
    sizeDeltaInTokens: expandDecimals(1, 18),
    collateralDeltaAmount: 0n,
    triggerPrice: expandDecimals(2000, 30),
    acceptablePrice: expandDecimals(2000, 30),
    triggerOrderType: OrderType.LimitDecrease,
    decreaseSwapType: 0,
    ...overrides,
  } as unknown as DecreasePositionAmounts;
}

function makeExistingOrder(overrides: Partial<PositionOrderInfo> = {}): PositionOrderInfo {
  return {
    key: "0xexistingorderkey",
    orderType: OrderType.LimitDecrease,
    sizeDeltaUsd: MaxUint256,
    minOutputAmount: 0n,
    autoCancel: true,
    indexToken: WETH,
    decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
    executionFee: 0n,
    srcChainId: 0n,
    ...overrides,
  } as unknown as PositionOrderInfo;
}

const baseParams = {
  autoCancelOrdersLimit: 2,
  chainId: CHAIN_ID,
  account: ACCOUNT,
  marketAddress: ETH_MARKET.marketTokenAddress,
  indexTokenAddress: WETH.address,
  collateralTokenAddress: USDC.address,
  isLong: true,
  isGmxAccount: false,
  isGmxAccountPosition: false,
  isOrdersLoading: false,
  userReferralCode: undefined,
};

describe("buildTpSlBatchPayloads", () => {
  it("emits an update payload when a full-close TP already exists", () => {
    const result = buildTpSlBatchPayloads({
      ...baseParams,
      entries: [
        {
          amounts: makeAmounts({ isFullClose: true, triggerPrice: expandDecimals(3000, 30) }),
          executionFeeAmount: 0n,
          executionGasLimit: 0n,
          existingFullCloseOrder: makeExistingOrder({ key: "0xtpkey" }),
        },
      ],
    });

    expect(result.createOrderParams).toHaveLength(0);
    expect(result.updateOrderParams).toHaveLength(1);
    expect(result.updateOrderParams[0].updatePayload.orderKey).toBe("0xtpkey");
    expect(result.updateOrderParams[0].updatePayload.sizeDeltaUsd).toBe(MaxUint256);
    expect(result.updateOrderParams[0].updatePayload.executionFeeTopUp).toBe(0n);
  });

  it.each([
    { storedFee: 1000n, estimatedFee: 1500n, expectedTopUp: 500n },
    { storedFee: 2000n, estimatedFee: 1500n, expectedTopUp: 0n },
  ])(
    "tops up the stored fee $storedFee of the updated order to the estimate $estimatedFee",
    ({ storedFee, estimatedFee, expectedTopUp }) => {
      const result = buildTpSlBatchPayloads({
        ...baseParams,
        entries: [
          {
            amounts: makeAmounts({ isFullClose: true }),
            executionFeeAmount: estimatedFee,
            executionGasLimit: 3000000n,
            existingFullCloseOrder: makeExistingOrder({ executionFee: storedFee }),
          },
        ],
      });

      const [update] = result.updateOrderParams;

      expect(update.updatePayload.executionFeeTopUp).toBe(expectedTopUp);
      expect(update.params.executionGasLimit).toBe(3000000n);
    }
  );

  it("emits a create payload when no existing full-close order exists", () => {
    const result = buildTpSlBatchPayloads({
      ...baseParams,
      entries: [
        {
          amounts: makeAmounts({ isFullClose: true }),
          executionFeeAmount: 0n,
          executionGasLimit: 0n,
          sizeDeltaUsd: MaxUint256,
        },
      ],
    });

    expect(result.createOrderParams).toHaveLength(1);
    expect(result.updateOrderParams).toHaveLength(0);
  });

  it("creates a new order for partial close even when a full-close order exists", () => {
    const result = buildTpSlBatchPayloads({
      ...baseParams,
      entries: [
        {
          amounts: makeAmounts({ isFullClose: false }),
          executionFeeAmount: 0n,
          executionGasLimit: 0n,
          existingFullCloseOrder: makeExistingOrder(),
        },
      ],
    });

    expect(result.createOrderParams).toHaveLength(1);
    expect(result.updateOrderParams).toHaveLength(0);
  });

  it("preserves no-swap split receive on created orders", () => {
    const result = buildTpSlBatchPayloads({
      ...baseParams,
      entries: [
        {
          amounts: makeAmounts({ decreaseSwapType: DecreasePositionSwapType.NoSwap }),
          executionFeeAmount: 0n,
          executionGasLimit: 0n,
        },
      ],
    });

    expect(result.createOrderParams).toHaveLength(1);
    expect(result.createOrderParams[0].orderPayload.decreasePositionSwapType).toBe(DecreasePositionSwapType.NoSwap);
    expect(result.createOrderParams[0].orderPayload.addresses.swapPath).toEqual([]);
  });

  it("cancels and recreates instead of updating when the swap type differs from the existing full-close order", () => {
    const result = buildTpSlBatchPayloads({
      ...baseParams,
      entries: [
        {
          amounts: makeAmounts({ isFullClose: true, decreaseSwapType: DecreasePositionSwapType.NoSwap }),
          executionFeeAmount: 0n,
          executionGasLimit: 0n,
          existingFullCloseOrder: makeExistingOrder({
            key: "0xtpkey",
            decreasePositionSwapType: DecreasePositionSwapType.SwapPnlTokenToCollateralToken,
          }),
        },
      ],
    });

    expect(result.updateOrderParams).toHaveLength(0);
    expect(result.cancelOrderParams).toHaveLength(1);
    expect(result.cancelOrderParams[0].orderKey).toBe("0xtpkey");
    expect(result.createOrderParams).toHaveLength(1);
    expect(result.createOrderParams[0].orderPayload.decreasePositionSwapType).toBe(DecreasePositionSwapType.NoSwap);
  });

  const GMX_ACCOUNT_ORDER = BigInt(ARBITRUM);

  it.each([
    { orderSrcChainId: 0n, isGmxAccountPosition: false, isGmxAccount: false, recreates: false },
    { orderSrcChainId: 0n, isGmxAccountPosition: false, isGmxAccount: true, recreates: false },
    { orderSrcChainId: 0n, isGmxAccountPosition: true, isGmxAccount: false, recreates: false },
    { orderSrcChainId: 0n, isGmxAccountPosition: true, isGmxAccount: true, recreates: true },
    { orderSrcChainId: GMX_ACCOUNT_ORDER, isGmxAccountPosition: false, isGmxAccount: false, recreates: true },
    { orderSrcChainId: GMX_ACCOUNT_ORDER, isGmxAccountPosition: false, isGmxAccount: true, recreates: false },
    { orderSrcChainId: GMX_ACCOUNT_ORDER, isGmxAccountPosition: true, isGmxAccount: false, recreates: false },
    { orderSrcChainId: GMX_ACCOUNT_ORDER, isGmxAccountPosition: true, isGmxAccount: true, recreates: false },
  ])(
    "full-close order srcChainId $orderSrcChainId, GMX Account position $isGmxAccountPosition, window pays from the GMX Account $isGmxAccount: recreates $recreates TRD-44",
    ({ orderSrcChainId, isGmxAccountPosition, isGmxAccount, recreates }) => {
      const result = buildTpSlBatchPayloads({
        ...baseParams,
        isGmxAccount,
        isGmxAccountPosition,
        entries: [
          {
            amounts: makeAmounts({ isFullClose: true, decreaseSwapType: DecreasePositionSwapType.NoSwap }),
            executionFeeAmount: 0n,
            executionGasLimit: 0n,
            existingFullCloseOrder: makeExistingOrder({ key: "0xtpkey", srcChainId: orderSrcChainId }),
          },
        ],
      });

      expect(result.cancelOrderParams.map((cancel) => cancel.orderKey)).toEqual(recreates ? ["0xtpkey"] : []);
      expect(result.updateOrderParams).toHaveLength(recreates ? 0 : 1);
      expect(result.createOrderParams).toHaveLength(recreates ? 1 : 0);
    }
  );

  it.each([
    {
      isGmxAccountPosition: undefined,
      isOrdersLoading: false,
      existingFullCloseOrder: makeExistingOrder({ key: "0xtpkey", srcChainId: GMX_ACCOUNT_ORDER }),
    },
    { isGmxAccountPosition: true, isOrdersLoading: true, existingFullCloseOrder: undefined },
  ])(
    "builds no orders until the position balance and the orders are loaded: GMX Account position $isGmxAccountPosition, orders loading $isOrdersLoading TRD-44",
    ({ isGmxAccountPosition, isOrdersLoading, existingFullCloseOrder }) => {
      const result = buildTpSlBatchPayloads({
        ...baseParams,
        isGmxAccountPosition,
        isOrdersLoading,
        entries: [
          {
            amounts: makeAmounts({ isFullClose: true }),
            executionFeeAmount: 0n,
            executionGasLimit: 0n,
            existingFullCloseOrder,
          },
        ],
      });

      expect(result).toEqual({ createOrderParams: [], updateOrderParams: [], cancelOrderParams: [] });
    }
  );

  it("updates in place when the swap type matches the existing full-close order", () => {
    const result = buildTpSlBatchPayloads({
      ...baseParams,
      entries: [
        {
          amounts: makeAmounts({ isFullClose: true, decreaseSwapType: DecreasePositionSwapType.NoSwap }),
          executionFeeAmount: 0n,
          executionGasLimit: 0n,
          existingFullCloseOrder: makeExistingOrder({
            key: "0xtpkey",
            decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
          }),
        },
      ],
    });

    expect(result.updateOrderParams).toHaveLength(1);
    expect(result.cancelOrderParams).toHaveLength(0);
    expect(result.createOrderParams).toHaveLength(0);
  });

  it("handles TP and SL independently - update one, create the other", () => {
    const result = buildTpSlBatchPayloads({
      ...baseParams,
      entries: [
        {
          amounts: makeAmounts({ isFullClose: true, triggerOrderType: OrderType.LimitDecrease }),
          executionFeeAmount: 0n,
          executionGasLimit: 0n,
          existingFullCloseOrder: makeExistingOrder({ key: "0xtpkey", orderType: OrderType.LimitDecrease }),
        },
        {
          amounts: makeAmounts({ isFullClose: true, triggerOrderType: OrderType.StopLossDecrease }),
          executionFeeAmount: 0n,
          executionGasLimit: 0n,
          sizeDeltaUsd: MaxUint256,
        },
      ],
    });

    expect(result.createOrderParams).toHaveLength(1);
    expect(result.updateOrderParams).toHaveLength(1);
    expect(result.updateOrderParams[0].updatePayload.orderKey).toBe("0xtpkey");
  });
});
