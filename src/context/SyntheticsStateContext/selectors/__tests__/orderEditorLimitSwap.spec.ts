import { parseUnits, zeroAddress } from "viem";
import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";
import { createMockSyntheticsState, MOCK_ACCOUNT } from "domain/testUtils/mockSyntheticsState";
import { formatAmountFree } from "lib/numbers";
import { getTokenBySymbol, getWrappedToken } from "sdk/configs/tokens";
import { DecreasePositionSwapType, Order, OrderType, SwapOrderInfo } from "sdk/utils/orders/types";
import { getOrderInfo } from "sdk/utils/orders/utils";
import type { TokenData, TokensRatioAndSlippage } from "sdk/utils/tokens/types";

import {
  selectOrderEditorMarkRatio,
  selectOrderEditorMarkRatioInputValue,
  selectOrderEditorMinOutputAmount,
  selectOrderEditorSwapTriggerPrice,
  selectOrderEditorTriggerRatio,
} from "../orderEditorSelectors";

function withPrice(symbol: string, usd: string): TokenData {
  const price = parseUnits(usd, 30);
  return { ...getTokenBySymbol(ARBITRUM, symbol), prices: { minPrice: price, maxPrice: price } } as TokenData;
}

// a pending limit swap with the given stored fields, opened in the editor the way the dialog opens it
function openEditor(p: {
  from: TokenData;
  to: TokenData;
  fromAmount: bigint;
  minOutputAmount: bigint;
  triggerPrice: bigint;
}) {
  const { from, to } = p;
  const tokensData = { [from.address]: from, [to.address]: to };
  const market = createMockMarketInfo(from, {
    indexTokenAddress: from.address,
    longTokenAddress: from.address,
    shortTokenAddress: to.address,
    longToken: from,
    shortToken: to,
  });
  const order: Order = {
    key: "0x01",
    account: MOCK_ACCOUNT,
    receiver: MOCK_ACCOUNT,
    callbackContract: zeroAddress,
    uiFeeReceiver: zeroAddress,
    marketAddress: zeroAddress,
    initialCollateralTokenAddress: from.address,
    swapPath: [market.marketTokenAddress],
    orderType: OrderType.LimitSwap,
    decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
    initialCollateralDeltaAmount: p.fromAmount,
    contractTriggerPrice: p.triggerPrice,
    minOutputAmount: p.minOutputAmount,
    contractAcceptablePrice: 0n,
    sizeDeltaUsd: 0n,
    callbackGasLimit: 0n,
    executionFee: 0n,
    updatedAtTime: 0n,
    validFromTime: 0n,
    uiFeeFactor: 0n,
    srcChainId: 0n,
    isFrozen: false,
    isLong: false,
    shouldUnwrapNativeToken: false,
    autoCancel: false,
    data: [],
  };
  const orderInfo = getOrderInfo({
    marketsInfoData: { [market.marketTokenAddress]: market },
    tokensData,
    wrappedNativeToken: getWrappedToken(ARBITRUM),
    order,
  }) as SwapOrderInfo;
  const storedRatio = orderInfo.triggerRatio as TokensRatioAndSlippage;

  const state = createMockSyntheticsState({
    tokensData,
    marketInfo: market,
    ordersInfoData: { [order.key]: orderInfo },
    orderEditor: { editingOrderState: { orderKey: order.key, source: "PositionsList" } },
  });
  state.orderEditor.triggerRatioInputValue = formatAmountFree(storedRatio.ratio, 30);
  state.orderEditor.selectedAllowedSwapSlippageBps = storedRatio.allowedSwapSlippageBps;

  return state;
}

type EditorState = ReturnType<typeof openEditor>;

function edit(state: EditorState, patch: Partial<EditorState["orderEditor"]>): EditorState {
  return { ...state, orderEditor: { ...state.orderEditor, shouldCalculateMinOutputAmount: true, ...patch } };
}

function sign(state: EditorState) {
  return {
    triggerPrice: selectOrderEditorSwapTriggerPrice(state)!,
    minOutputAmount: selectOrderEditorMinOutputAmount(state),
  };
}

describe("limit swap order editor", () => {
  it("keeps the limit in the order's own direction across edits after the prices cross TRD-43", () => {
    const avax = withPrice("AVAX", "20");
    const gmx = withPrice("GMX", "20.4");

    // AVAX -> GMX at 1.04 GMX per AVAX with no slippage, placed while AVAX was the more expensive token
    const placed = {
      from: avax,
      to: gmx,
      fromAmount: parseUnits("1000", 18),
      minOutputAmount: parseUnits("1040", 18),
      triggerPrice: parseUnits("1.04", 30),
    };
    const opened = openEditor(placed);

    expect(selectOrderEditorTriggerRatio(opened)).toMatchObject({
      ratio: parseUnits("1.04", 30),
      largestToken: { symbol: "AVAX" },
    });
    expect(selectOrderEditorMarkRatio(opened)).toMatchObject({
      ratio: (parseUnits("20", 30) * parseUnits("1", 30)) / parseUnits("20.4", 30),
      largestToken: { symbol: "AVAX" },
    });

    // AVAX -> GMX at 1.03 AVAX per GMX with no slippage: pays with the cheaper token
    const placedCheaper = {
      ...placed,
      minOutputAmount: parseUnits("970.873786407766990291", 18),
      triggerPrice: parseUnits("1.03", 30),
    };

    const cases = [
      {
        order: placed,
        first: { selectedAllowedSwapSlippageBps: 200n },
        signedTrigger: "1.04",
        firstFloor: "1019.2",
        second: 0n,
        secondFloor: "1040",
      },
      // the floor drops below parity: the stored pair alone would read the other way round,
      // so the same limit is signed in the other unit
      {
        order: placed,
        first: { selectedAllowedSwapSlippageBps: 800n },
        signedTrigger: "0.9615384615",
        firstFloor: "956.8",
        second: 200n,
        secondFloor: "1019.2",
      },
      // the limit moves to the mark, below 1 GMX per AVAX after the prices crossed
      {
        order: placed,
        first: { triggerRatioInputValue: selectOrderEditorMarkRatioInputValue(opened), selectedAllowedSwapSlippageBps: 0n },
        signedTrigger: "1.0199999999",
        firstFloor: "980.3921569",
        second: 50n,
        secondFloor: "975.490196115",
      },
      {
        order: placedCheaper,
        first: { selectedAllowedSwapSlippageBps: 100n },
        signedTrigger: "1.03",
        firstFloor: "961.165048543",
        second: 0n,
        secondFloor: "970.873786407",
      },
    ];

    for (const { order, first, signedTrigger, firstFloor, second, secondFloor } of cases) {
      const signed = sign(edit(openEditor(order), first));
      const reopened = openEditor({ ...order, ...signed });
      const secondSigned = sign(edit(reopened, { selectedAllowedSwapSlippageBps: second }));

      expect(signed.triggerPrice).toBe(parseUnits(signedTrigger, 30));
      expect(secondSigned.triggerPrice).toBe(signed.triggerPrice);
      expect(signed.minOutputAmount - parseUnits(firstFloor, 18)).toBeLessThan(parseUnits("0.000001", 18));
      expect(signed.minOutputAmount).toBeGreaterThanOrEqual(parseUnits(firstFloor, 18));
      expect(secondSigned.minOutputAmount - parseUnits(secondFloor, 18)).toBeLessThan(parseUnits("0.000001", 18));
      expect(secondSigned.minOutputAmount).toBeGreaterThanOrEqual(parseUnits(secondFloor, 18));
    }
  });

  it("fills Mark with a limit on the side of the mark the dialog accepts TRD-43", () => {
    // the mark ratio has more than the 10 decimals the field gets
    const cases = [
      // pays with the more expensive token: the limit must not be below the mark
      { from: withPrice("AVAX", "20.123456789012"), to: withPrice("GMX", "19.876543210987"), isAboveMark: true },
      // pays with the cheaper token: the limit must not be above the mark
      { from: withPrice("GMX", "19.876543210987"), to: withPrice("AVAX", "20.123456789012"), isAboveMark: false },
    ];

    for (const { from, to, isAboveMark } of cases) {
      const state = openEditor({
        from,
        to,
        fromAmount: parseUnits("1000", 18),
        minOutputAmount: parseUnits(isAboveMark ? "1030" : "970", 18),
        triggerPrice: parseUnits("1.03", 30),
      });
      const mark = selectOrderEditorMarkRatio(state)!.ratio;
      const filled = selectOrderEditorTriggerRatio(
        edit(state, { triggerRatioInputValue: selectOrderEditorMarkRatioInputValue(state) })
      )!.ratio;

      expect(isAboveMark ? filled >= mark : filled <= mark).toBe(true);
      expect(filled - mark < parseUnits("1", 20) && mark - filled < parseUnits("1", 20)).toBe(true);
    }
  });

  it("asks for a limit instead of using the mark when the field is empty TRD-43", () => {
    const state = openEditor({
      from: withPrice("AVAX", "20"),
      to: withPrice("GMX", "20.4"),
      fromAmount: parseUnits("1000", 18),
      minOutputAmount: parseUnits("1040", 18),
      triggerPrice: parseUnits("1.04", 30),
    });

    expect(selectOrderEditorTriggerRatio(edit(state, { triggerRatioInputValue: "" }))).toBeUndefined();
    expect(selectOrderEditorTriggerRatio(edit(state, { triggerRatioInputValue: "0" }))).toBeUndefined();
  });
});
