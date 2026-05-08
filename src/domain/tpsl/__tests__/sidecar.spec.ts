import { describe, expect, it } from "vitest";

import { OrderType, PositionOrderInfo } from "domain/synthetics/orders";
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
