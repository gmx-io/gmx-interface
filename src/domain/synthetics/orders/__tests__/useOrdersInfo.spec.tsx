import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { expandDecimals } from "lib/numbers";
import { mockMarketsInfoData, mockTokensData } from "sdk/test/mock";
import { encodeOrderDataListMetadata } from "sdk/utils/twap/uiFeeReceiver";

const { ordersDataRef } = vi.hoisted(() => ({ ordersDataRef: { current: {} as OrdersData } }));

vi.mock("../useOrders", () => ({
  useOrders: () => ({ ordersData: ordersDataRef.current, count: Object.keys(ordersDataRef.current).length }),
}));

import { DecreasePositionSwapType, Order, OrderInfo, OrderType, OrdersData } from "../types";
import { useOrdersInfoRequest } from "../useOrdersInfo";

const ACCOUNT = "0x1111111111111111111111111111111111111111";
const tokensData = mockTokensData();
const marketsInfoData = mockMarketsInfoData(tokensData, ["ETH-ETH-USDC"]);

function makeTwapPart(index: number, isFrozen: boolean): Order {
  return {
    key: `0xpart${index}`,
    account: ACCOUNT,
    receiver: ACCOUNT,
    callbackContract: "0x0000000000000000000000000000000000000000",
    uiFeeReceiver: "0x0000000000000000000000000000000000000000",
    marketAddress: marketsInfoData["ETH-ETH-USDC"].marketTokenAddress,
    initialCollateralTokenAddress: tokensData.USDC.address,
    swapPath: [],
    orderType: OrderType.LimitDecrease,
    decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
    sizeDeltaUsd: expandDecimals(100, 30),
    initialCollateralDeltaAmount: 0n,
    contractTriggerPrice: 0n,
    contractAcceptablePrice: 0n,
    executionFee: 0n,
    callbackGasLimit: 0n,
    minOutputAmount: 0n,
    uiFeeFactor: 0n,
    updatedAtTime: 1n,
    validFromTime: BigInt(1000 + index),
    isLong: true,
    isFrozen,
    shouldUnwrapNativeToken: false,
    autoCancel: false,
    data: [encodeOrderDataListMetadata({ numberOfParts: 3, twapId: "1edc" })],
  };
}

function getOrdersInfo(parts: Order[]) {
  ordersDataRef.current = Object.fromEntries(parts.map((part) => [part.key, part]));

  let ordersInfo: OrderInfo[] = [];
  function Probe() {
    ordersInfo = Object.values(
      useOrdersInfoRequest(ARBITRUM, { account: ACCOUNT, marketsInfoData, tokensData }).ordersInfoData ?? {}
    );
    return null;
  }
  render(<Probe />);

  return ordersInfo;
}

describe("useOrdersInfoRequest", () => {
  afterEach(cleanup);

  it.each([
    { partsFrozen: [false, true, false], isTwapFrozen: true },
    { partsFrozen: [true, false, false], isTwapFrozen: true },
    { partsFrozen: [false, false, false], isTwapFrozen: false },
  ])("marks a TWAP frozen when any of its parts is frozen PRO-4404: $partsFrozen", ({ partsFrozen, isTwapFrozen }) => {
    const [twap] = getOrdersInfo(partsFrozen.map((isFrozen, index) => makeTwapPart(index, isFrozen)));

    expect(twap.isTwap).toBe(true);
    expect(twap.isFrozen).toBe(isTwapFrozen);
  });
});
