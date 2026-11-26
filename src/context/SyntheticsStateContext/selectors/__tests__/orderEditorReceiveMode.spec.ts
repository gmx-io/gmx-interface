import { describe, expect, it } from "vitest";

import { ARBITRUM_SEPOLIA, AVALANCHE_FUJI } from "config/chains";
import type { SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { ORDER_EDITOR_RECEIVE_MODE_FLAG } from "domain/synthetics/uiFlags/uiFlags";
import { MOCK_GAS_LIMITS, MOCK_GAS_PRICE } from "domain/testUtils/mockChainData";
import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";
import { createMockPositionInfo } from "domain/testUtils/mockPositionInfo";
import { createMockSyntheticsState, MOCK_ACCOUNT } from "domain/testUtils/mockSyntheticsState";
import {
  ETH_ADDRESS,
  ETH_TOKEN,
  NATIVE_ETH_ADDRESS,
  NATIVE_ETH_TOKEN,
  USDC_ADDRESS,
  USDC_TOKEN,
} from "domain/testUtils/mockTokens";
import { FULL_POSITION_CLOSE_SIZE_DELTA_USD as FULL } from "domain/tpsl/utils";
import { expandDecimals } from "lib/numbers";
import { DecreasePositionSwapType, OrderType, type PositionOrderInfo } from "sdk/utils/orders/types";
import { convertToTokenAmount } from "sdk/utils/tokens";
import type { TokenData } from "sdk/utils/tokens/types";

import {
  selectOrderEditorReceiveTokens,
  selectOrderEditorDecreasePositionSwapType,
  selectOrderEditorExecutionFee,
  selectOrderEditorIsReceiveSeparated,
  selectOrderEditorPositionOrderError,
  selectOrderEditorReceiveOutputs,
} from "../orderEditorSelectors";

const {
  NoSwap,
  SwapPnlTokenToCollateralToken: ToCollateral,
  SwapCollateralTokenToPnlToken: ToPnl,
} = DecreasePositionSwapType;
const { StopLossDecrease, LimitIncrease } = OrderType;
const SWAP_MARKET = "0x450bb6774Dd8a756274E0ab4107953259d2ac541";
const USD_200 = expandDecimals(200, 30);
const USDC_200 = expandDecimals(200, 6);
const USDC_1000 = expandDecimals(1000, 6);
const USD_198 = expandDecimals(198, 30); // $200 withdrawal after the 1% swap fee
const ETH_198_AT_2400 = convertToTokenAmount(USD_198, 18, expandDecimals(2400, 30))!;
const ETH_198_AT_1800 = convertToTokenAmount(USD_198, 18, expandDecimals(1800, 30))!;
const SL = { type: StopLossDecrease, trigger: 1800 };
const HALF = { size: 1000 };
const noChange = expect.stringMatching(/^Enter a new/);

// 1 ETH long opened at $2000 with $1000 of USDC collateral; ETH trades at $2000; a take-profit at $2400 by default
type Case = {
  noPosition?: boolean;
  isLong?: boolean;
  keeperFlag?: "absent" | boolean;
  mode: DecreasePositionSwapType; // stored on the order
  separated?: boolean; // the switch; undefined = untouched
  type?: OrderType;
  collateral?: TokenData;
  swapPath?: string[];
  size?: number; // close size typed in the editor, USD
  orderSize?: bigint;
  trigger?: number;
  withdrawal?: bigint; // collateral withdrawal stored on the order
  chainId?: number;
  keepLeverage?: boolean;
  borrowingFeeUsd?: bigint;
  srcChainId?: bigint;
  unwrap?: boolean;
  maxShortPoolAmount?: bigint;
};

function makeState(p: Case): SyntheticsState {
  const marketInfo = createMockMarketInfo(ETH_TOKEN, {
    ...(p.maxShortPoolAmount !== undefined && { maxShortPoolAmount: p.maxShortPoolAmount }),
    longInterestUsd: expandDecimals(2000, 30),
    longInterestInTokens: expandDecimals(1, 18),
    swapFeeFactorForBalanceWasImproved: expandDecimals(1, 28),
    swapFeeFactorForBalanceWasNotImproved: expandDecimals(1, 28),
    swapImpactFactorPositive: 0n,
    swapImpactFactorNegative: 0n,
  });
  const collateral = p.collateral ?? USDC_TOKEN;
  const order = {
    key: "0xorder",
    account: MOCK_ACCOUNT,
    marketAddress: marketInfo.marketTokenAddress,
    marketInfo,
    indexToken: marketInfo.indexToken,
    initialCollateralTokenAddress: collateral.address,
    initialCollateralToken: collateral,
    targetCollateralToken: collateral,
    swapPath: p.swapPath ?? [],
    isLong: p.isLong ?? true,
    isTwap: false,
    shouldUnwrapNativeToken: p.unwrap ?? false,
    srcChainId: p.srcChainId ?? 0n,
    orderType: p.type ?? OrderType.LimitDecrease,
    decreasePositionSwapType: p.mode,
    sizeDeltaUsd: p.orderSize ?? expandDecimals(p.size ?? 2000, 30),
    initialCollateralDeltaAmount: p.withdrawal ?? 0n,
    triggerPrice: expandDecimals(p.trigger ?? 2400, 30),
    acceptablePrice: 0n,
    minOutputAmount: 0n,
    executionFee: expandDecimals(1, 15),
    uiFeeFactor: 0n,
  } as unknown as PositionOrderInfo;
  const position = {
    ...createMockPositionInfo({ account: MOCK_ACCOUNT, marketInfo, collateralToken: collateral, isLong: p.isLong }),
    pendingBorrowingFeesUsd: p.borrowingFeeUsd ?? 0n,
  };

  const state = createMockSyntheticsState({
    account: MOCK_ACCOUNT,
    marketInfo,
    tokensData: { [USDC_ADDRESS]: USDC_TOKEN, [ETH_ADDRESS]: ETH_TOKEN, [NATIVE_ETH_ADDRESS]: NATIVE_ETH_TOKEN },
    positionsInfoData: p.noPosition ? {} : { [position.key]: position },
    ordersInfoData: { [order.key]: order },
    orderEditor: {
      editingOrderState: { orderKey: order.key, source: "PositionsList" },
      sizeInputValue: String(p.size ?? 2000),
      triggerPriceInputValue: String(p.trigger ?? 2400),
      isReceiveSeparated: p.separated,
      acceptablePrice: 0n,
      acceptablePriceImpactBps: 0n,
    } as never,
  });

  Object.assign(state.globals, {
    chainId: p.chainId ?? ARBITRUM_SEPOLIA,
    gasLimits: MOCK_GAS_LIMITS,
    gasPrice: MOCK_GAS_PRICE,
    keepLeverage: p.keepLeverage,
  });

  state.uiFlags =
    p.keeperFlag === "absent"
      ? undefined
      : {
          [ORDER_EDITOR_RECEIVE_MODE_FLAG]: { enabled: p.keeperFlag ?? true, createdAt: "", updatedAt: "" },
        };
  return state;
}

describe("order editor receive mode PRO-4070", () => {
  it.each<[string, Case, boolean, DecreasePositionSwapType, boolean, bigint]>([
    // case → switch shown, receive mode sent, Update blocked as "no change", extra swaps in the execution gas
    ["split, untouched", { mode: NoSwap }, true, NoSwap, true, 0n],
    ["full close, untouched", { mode: NoSwap, orderSize: FULL }, true, NoSwap, true, 0n],
    ["full close, switched off", { mode: NoSwap, orderSize: FULL, separated: false }, true, ToCollateral, false, 1n],
    ["split, switched off", { mode: NoSwap, separated: false }, true, ToCollateral, false, 1n],
    ["one token, switched on", { mode: ToCollateral, separated: true }, true, NoSwap, false, -1n],
    ["PnL token, switched on", { mode: ToPnl, separated: true }, true, NoSwap, false, -1n],
    ["PnL token, switched back off", { mode: ToPnl, separated: false }, true, ToPnl, true, 0n],
    ["SL, switched off", { mode: NoSwap, ...SL, separated: false }, true, ToCollateral, false, 1n],
    ["keeper flag missing", { mode: NoSwap, keeperFlag: "absent", separated: false }, false, NoSwap, true, 0n],
    ["keeper flag off", { mode: ToPnl, keeperFlag: false, separated: true }, false, ToPnl, true, 0n],
    [
      "pending 100% TP below mark, mode only",
      { mode: NoSwap, noPosition: true, orderSize: FULL, size: 0, trigger: 1900, separated: false },
      true,
      ToCollateral,
      false,
      1n,
    ],
    ["pending long TP", { mode: NoSwap, noPosition: true, separated: false }, true, ToCollateral, false, 1n],
    [
      "pending short SL",
      { mode: ToPnl, noPosition: true, isLong: false, collateral: ETH_TOKEN, separated: true, type: StopLossDecrease },
      true,
      NoSwap,
      false,
      -1n,
    ],
    [
      "pending short, same collateral",
      { mode: NoSwap, noPosition: true, isLong: false, trigger: 1800, separated: false },
      false,
      NoSwap,
      true,
      0n,
    ],
    ["same collateral token", { mode: NoSwap, collateral: ETH_TOKEN, separated: false }, false, NoSwap, true, 0n],
    ["swap path", { mode: ToCollateral, swapPath: [SWAP_MARKET], separated: true }, false, ToCollateral, true, 0n],
    ["2.2c chain", { mode: NoSwap, chainId: AVALANCHE_FUJI, separated: false }, false, NoSwap, true, 0n],
    ["limit increase", { mode: NoSwap, type: LimitIncrease, trigger: 1800, separated: false }, false, NoSwap, true, 0n],
  ])("%s", (_, p, isShown, sentMode, isNoChange, extraSwaps) => {
    const state = makeState(p);
    const gas = (s: SyntheticsState) => selectOrderEditorExecutionFee(s)?.gasLimit ?? 0n;

    expect(Boolean(selectOrderEditorReceiveTokens(state))).toBe(isShown);
    if (p.noPosition) expect(selectOrderEditorReceiveOutputs(state)).toEqual([]);
    expect(selectOrderEditorIsReceiveSeparated(state)).toBe(p.separated ?? p.mode === NoSwap);
    expect(selectOrderEditorDecreasePositionSwapType(state)).toBe(sentMode);
    expect(selectOrderEditorPositionOrderError(state)).toEqual(isNoChange ? noChange : undefined);
    expect(gas(state) - gas(makeState({ ...p, separated: undefined }))).toBe(extraSwaps * MOCK_GAS_LIMITS.singleSwap);
  });

  it("still checks a new trigger or size against the mark for a pending take-profit", () => {
    const order = { mode: NoSwap, noPosition: true, trigger: 1900, separated: false };
    const editedPrice = makeState(order);
    editedPrice.orderEditor.triggerPriceInputValue = "1950";
    expect(selectOrderEditorPositionOrderError(editedPrice)).toMatch(/above mark price/);
    expect(selectOrderEditorPositionOrderError(makeState({ ...order, orderSize: USD_200, size: 100 }))).toMatch(
      /above mark price/
    );
  });

  it.each<[string, Case, string, bigint, bigint]>([
    // case → token that carries the stored withdrawal, USD and amount it adds to the preview
    ["full close, all collateral", { mode: NoSwap, withdrawal: USDC_1000 }, USDC_ADDRESS, 0n, 0n],
    ["half close, all collateral: cancelled", { mode: NoSwap, ...HALF, withdrawal: USDC_1000 }, USDC_ADDRESS, 0n, 0n],
    ["half close, split", { mode: NoSwap, ...HALF, withdrawal: USDC_200 }, USDC_ADDRESS, USD_200, USDC_200],
    ["half close, one token", { mode: ToCollateral, ...HALF, withdrawal: USDC_200 }, USDC_ADDRESS, USD_200, USDC_200],
    ["half close, PnL token", { mode: ToPnl, ...HALF, withdrawal: USDC_200 }, ETH_ADDRESS, USD_198, ETH_198_AT_2400],
    ["SL, PnL token", { mode: ToPnl, ...SL, ...HALF, withdrawal: USDC_200 }, ETH_ADDRESS, USD_198, ETH_198_AT_1800],
  ])("previews the stored withdrawal: %s", (_, p, carrier, addedUsd, addedAmount) => {
    const withDelta = selectOrderEditorReceiveOutputs(makeState(p));
    const without = selectOrderEditorReceiveOutputs(makeState({ ...p, withdrawal: undefined }));
    const sum = (outputs: typeof without, key: "usd" | "amount", address?: string) =>
      outputs.filter((o) => !address || o.token.address === address).reduce((total, o) => total + o[key], 0n);

    expect(sum(withDelta, "usd") - sum(without, "usd")).toBe(addedUsd);
    expect(sum(withDelta, "usd", carrier) - sum(without, "usd", carrier)).toBe(addedUsd);
    expect(sum(withDelta, "amount", carrier) - sum(without, "amount", carrier)).toBe(addedAmount);
    // the contract withdraws only the stored amount, so Keep leverage must not change the preview
    expect(selectOrderEditorReceiveOutputs(makeState({ ...p, keepLeverage: true }))).toEqual(withDelta);
  });

  it("pays split-receive costs from collateral before spending profit", () => {
    const outputs = (borrowingFeeUsd: bigint) =>
      selectOrderEditorReceiveOutputs(makeState({ mode: NoSwap, borrowingFeeUsd }));
    const base = outputs(0n);
    const withFee = outputs(USD_200);
    expect(withFee.find((o) => o.token.address === ETH_ADDRESS)).toEqual(
      base.find((o) => o.token.address === ETH_ADDRESS)
    );
    expect(
      base.find((o) => o.token.address === USDC_ADDRESS)!.amount -
        withFee.find((o) => o.token.address === USDC_ADDRESS)!.amount
    ).toBe(USDC_200);
  });

  it.each([
    [0n, false, ETH_ADDRESS],
    [0n, true, NATIVE_ETH_ADDRESS],
    [42161n, true, ETH_ADDRESS],
  ] as const)("uses the payout token for source chain %s and unwrap %s", (srcChainId, unwrap, expectedToken) => {
    const outputs = selectOrderEditorReceiveOutputs(makeState({ mode: NoSwap, srcChainId, unwrap }));
    expect(outputs.map((o) => o.token.address)).toEqual([expectedToken, USDC_ADDRESS]);
  });

  it("receives both tokens when the pool cannot accept the collateral swap", () => {
    const p = { ...HALF, withdrawal: USDC_200, maxShortPoolAmount: 0n };
    const outputs = selectOrderEditorReceiveOutputs(makeState({ ...p, mode: ToPnl }));
    expect(outputs.map((o) => o.token.address)).toEqual([ETH_ADDRESS, USDC_ADDRESS]);
    expect(outputs).toEqual(selectOrderEditorReceiveOutputs(makeState({ ...p, mode: NoSwap })));
  });
});
