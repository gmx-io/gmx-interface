import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mockPositionInfo } from "domain/synthetics/testUtils/mocks";
import type { PositionEditorDepositMode } from "domain/synthetics/trade/usePositionEditorState";
import { expandDecimals } from "lib/numbers";
import { mockMarketsInfoData, mockTokensData } from "sdk/test/mock";
import type { TokenData } from "sdk/utils/tokens/types";

const { state } = vi.hoisted(() => ({
  state: {
    isPnlInLeverage: false,
    minCollateralUsd: undefined as bigint | undefined,
    position: undefined as any,
    depositMode: "now" as PositionEditorDepositMode,
    triggerPrice: undefined as bigint | undefined,
    collateralToken: undefined as TokenData | undefined,
    collateralDeltaAmount: undefined as bigint | undefined,
    collateralDeltaUsd: undefined as bigint | undefined,
    totalFeesDeltaUsd: 0n,
  },
}));

vi.mock("context/SettingsContext/SettingsContextProvider", () => ({
  useSettings: () => ({ isPnlInLeverage: state.isPnlInLeverage }),
}));

vi.mock("context/SyntheticsStateContext/hooks/globalsHooks", () => ({
  usePositionsConstants: () => ({ minCollateralUsd: state.minCollateralUsd }),
  useUserReferralInfo: () => undefined,
}));

vi.mock("context/SyntheticsStateContext/hooks/positionEditorHooks", () => ({
  usePositionEditorPosition: () => state.position,
  usePositionEditorDepositMode: () => [state.depositMode, vi.fn()],
  usePositionEditorTriggerPrice: () => state.triggerPrice,
}));

vi.mock("context/SyntheticsStateContext/selectors/positionEditorSelectors", () => ({
  selectPositionEditorSelectedCollateralToken: "collateralToken",
  selectPositionEditorCollateralInputAmountAndUsd: "collateralInput",
}));

vi.mock("context/SyntheticsStateContext/utils", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSelector: (key: string) =>
    key === "collateralToken"
      ? state.collateralToken
      : { collateralDeltaAmount: state.collateralDeltaAmount, collateralDeltaUsd: state.collateralDeltaUsd },
}));

vi.mock("../hooks/usePositionEditorFees", () => ({
  usePositionEditorFees: () => ({
    fees: { totalFees: { deltaUsd: state.totalFeesDeltaUsd } },
    executionFee: undefined,
  }),
}));

import { usePositionEditorData } from "../hooks/usePositionEditorData";
import { Operation } from "../types";

const tokensData = mockTokensData();
const marketsInfoData = mockMarketsInfoData(tokensData, ["ETH-ETH-USDC"]);
const marketInfo = marketsInfoData["ETH-ETH-USDC"];

const ACCOUNT = "0x1111111111111111111111111111111111111111";
const usd = (value: number) => expandDecimals(value, 30);

const TRIGGER_PRICE = usd(1_000);
const ONE_ETH = expandDecimals(1, 18);
const ONE_ETH_AT_MARK = usd(1_200);

type HookResult = ReturnType<typeof usePositionEditorData>;

function Harness({ operation, onResult }: { operation: Operation; onResult: (r: HookResult) => void }) {
  onResult(usePositionEditorData({ operation }));
  return null;
}

function setup(operation = Operation.Deposit): HookResult {
  let captured!: HookResult;
  render(<Harness operation={operation} onResult={(r) => (captured = r)} />);
  return captured;
}

function makePosition(collateralTokenAddress: string) {
  return mockPositionInfo({
    marketInfo,
    collateralTokenAddress,
    account: ACCOUNT,
    isLong: true,
    sizeInUsd: usd(10_000),
    collateralUsd: usd(2_000),
  });
}

beforeEach(() => {
  const position = makePosition(marketInfo.longToken.address);

  state.isPnlInLeverage = false;
  state.minCollateralUsd = usd(10);
  state.position = position;
  state.depositMode = "atPrice";
  state.triggerPrice = TRIGGER_PRICE;
  state.collateralToken = marketInfo.longToken;
  state.collateralDeltaAmount = ONE_ETH;
  // valued at the current price on purpose: the at-price branch must ignore it
  state.collateralDeltaUsd = ONE_ETH_AT_MARK;
  state.totalFeesDeltaUsd = -usd(50);
});

afterEach(cleanup);

describe("usePositionEditorData — at-price deposits", () => {
  it("values an index-token deposit at the trigger price instead of the current price", () => {
    expect(setup().nextCollateralUsd).toBe(usd(2_000) - usd(50) + usd(1_000));
  });

  it("values the same deposit at the current price in now mode", () => {
    state.depositMode = "now";

    expect(setup().nextCollateralUsd).toBe(usd(2_000) - usd(50) + ONE_ETH_AT_MARK);
  });

  it("keeps a stable-collateral deposit at its current price", () => {
    state.position = makePosition(marketInfo.shortToken.address);
    state.collateralToken = marketInfo.shortToken;
    state.collateralDeltaAmount = expandDecimals(1_000, 6);
    state.collateralDeltaUsd = usd(1_000);

    expect(setup().nextCollateralUsd).toBe(usd(2_000) - usd(50) + usd(1_000));
  });

  it("subtracts the pending fees from the deposit, pushing the projected liquidation price up", () => {
    const smallFees = setup();

    state.totalFeesDeltaUsd = -usd(500);
    const largeFees = setup();

    expect(largeFees.nextCollateralUsd).toBe(smallFees.nextCollateralUsd! - usd(450));
    expect(largeFees.nextLiqPrice!).toBeGreaterThan(smallFees.nextLiqPrice!);
    expect(largeFees.nextLeverage!).toBeGreaterThan(smallFees.nextLeverage!);
  });

  it("never projects anything to receive", () => {
    const result = setup();

    expect(result.receiveUsd).toBe(0n);
    expect(result.receiveAmount).toBe(0n);
  });

  it("projects nothing while the selected token is not the position collateral token", () => {
    state.collateralToken = marketInfo.shortToken;

    expect(setup()).toEqual({});
  });

  it("projects nothing without a trigger price or an amount", () => {
    state.triggerPrice = undefined;
    expect(setup()).toEqual({});

    state.triggerPrice = TRIGGER_PRICE;
    state.collateralDeltaAmount = undefined;
    expect(setup()).toEqual({});
  });

  it("leaves withdrawals on the standard path even in at-price mode", () => {
    const result = setup(Operation.Withdraw);

    expect(result.receiveUsd).toBe(ONE_ETH_AT_MARK);
    expect(result.nextCollateralUsd).toBe(usd(2_000) - usd(50) - ONE_ETH_AT_MARK);
  });
});
