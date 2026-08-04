import { describe, expect, it } from "vitest";

import { parseGetOrdersResponse } from "./utils";

const ACCOUNT = "0x1000000000000000000000000000000000000001";
const MARKET = "0x2000000000000000000000000000000000000002";
const TOKEN = "0x3000000000000000000000000000000000000003";
const ORDER_KEY = "0x4000000000000000000000000000000000000000000000000000000000000004";

function makeRawOrder(uiFeeFactor: bigint) {
  return {
    orderKey: ORDER_KEY,
    order: {
      addresses: {
        account: ACCOUNT,
        receiver: ACCOUNT,
        cancellationReceiver: ACCOUNT,
        callbackContract: ACCOUNT,
        uiFeeReceiver: ACCOUNT,
        market: MARKET,
        initialCollateralToken: TOKEN,
        swapPath: [],
      },
      numbers: {
        orderType: 2n,
        decreasePositionSwapType: 0n,
        sizeDeltaUsd: 1000n,
        initialCollateralDeltaAmount: 100n,
        triggerPrice: 0n,
        acceptablePrice: 0n,
        executionFee: 1n,
        callbackGasLimit: 0n,
        minOutputAmount: 0n,
        uiFeeFactor,
        updatedAtTime: 1n,
        validFromTime: 0n,
        srcChainId: 0n,
      },
      flags: { isLong: true, shouldUnwrapNativeToken: false, isFrozen: false, autoCancel: false },
      _dataList: [],
    },
  };
}

function makeResponse(uiFeeFactors: bigint[]) {
  return {
    data: {
      dataStore: {
        count: { returnValues: [BigInt(uiFeeFactors.length)] },
        keys: { returnValues: uiFeeFactors.map(() => ORDER_KEY) },
      },
      reader: {
        orders: { returnValues: uiFeeFactors.map(makeRawOrder) },
      },
    },
  } as any;
}

describe("parseGetOrdersResponse", () => {
  it("extracts the uiFeeFactor snapshot from order numbers", () => {
    const { orders } = parseGetOrdersResponse(makeResponse([5_000_000_000_000_000_000_000_000n]));

    expect(orders[0].uiFeeFactor).toBe(5_000_000_000_000_000_000_000_000n);
  });

  it("keeps a zero snapshot as 0n for pre-upgrade orders", () => {
    const { orders } = parseGetOrdersResponse(makeResponse([0n]));

    expect(orders[0].uiFeeFactor).toBe(0n);
    expect(orders[0].sizeDeltaUsd).toBe(1000n);
  });
});
