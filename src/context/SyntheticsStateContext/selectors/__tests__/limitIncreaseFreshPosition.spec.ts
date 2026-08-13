import { describe, expect, it } from "vitest";

import { AVALANCHE } from "config/chains";
import { mockPositionInfo } from "domain/synthetics/testUtils/mocks";
import { expandDecimals } from "lib/numbers";
import { DeepPartial } from "lib/types";
import { mockMarketsInfoData, mockTokensData } from "sdk/test/mock";
import { TradeMode, TradeType } from "sdk/utils/trade/types";

import { SyntheticsState } from "../../SyntheticsStateContextProvider";
import {
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxIsPositionLiquidatedBeforeTrigger,
  selectTradeboxNextPositionValues,
} from "../tradeboxSelectors";

const ACCOUNT = "0x1111111111111111111111111111111111111111";
const marketKey = "ETH-ETH-USDC";
const tokensData = mockTokensData();
const marketsInfoData = mockMarketsInfoData(tokensData, [marketKey]);
const marketInfo = marketsInfoData[marketKey];

const POSITION_SIZE_USD = expandDecimals(10_000, 30);
const POSITION_COLLATERAL_USD = expandDecimals(2_000, 30);
const PAY_USDC = "500";

function createState({
  isLong,
  liquidationPrice,
  triggerPriceInputValue,
}: {
  isLong: boolean;
  liquidationPrice: bigint;
  triggerPriceInputValue: string;
}): SyntheticsState {
  const position = mockPositionInfo(
    {
      marketInfo,
      collateralTokenAddress: tokensData.USDC.address,
      account: ACCOUNT,
      isLong,
      sizeInUsd: POSITION_SIZE_USD,
      collateralUsd: POSITION_COLLATERAL_USD,
    },
    { isLong, liquidationPrice }
  );

  const state: DeepPartial<SyntheticsState> = {
    pageType: "trade",
    globals: {
      chainId: AVALANCHE,
      account: ACCOUNT,
      marketsInfo: { marketsInfoData },
      tokensDataResult: { tokensData },
      positionsInfo: { positionsInfoData: { [position.key]: position } },
      positionsConstants: {
        minCollateralUsd: expandDecimals(1, 30),
        minPositionSizeUsd: expandDecimals(1, 30),
      },
      uiFeeFactor: 0n,
    },
    tradebox: {
      tradeType: isLong ? TradeType.Long : TradeType.Short,
      tradeMode: TradeMode.Limit,
      fromTokenAddress: tokensData.USDC.address,
      toTokenAddress: tokensData.ETH.address,
      marketAddress: marketInfo.marketTokenAddress,
      marketInfo,
      collateralAddress: tokensData.USDC.address,
      collateralToken: tokensData.USDC,
      fromTokenInputValue: PAY_USDC,
      toTokenInputValue: "",
      triggerPriceInputValue,
      focusedInput: "from",
      leverageOption: 2,
      allowedSlippage: 50,
    },
    externalSwap: {
      requestResult: undefined,
      setRequestResult: () => undefined,
      shouldFallbackToInternalSwap: false,
      shouldForceExternalSwap: false,
      setShouldFallbackToInternalSwap: () => undefined,
      setShouldForceExternalSwap: () => undefined,
    },
    settings: {
      isLeverageSliderEnabled: true,
      isPnlInLeverage: false,
      savedAcceptablePriceImpactBuffer: 30,
      showDebugValues: false,
    },
    subaccountState: { subaccount: undefined },
    features: { relayRouterEnabled: false, subaccountRelayRouterEnabled: false },
  };

  return state as SyntheticsState;
}

describe("Limit Increase beyond the current liquidation price", () => {
  describe.each([
    {
      name: "long",
      isLong: true,
      triggerPriceInputValue: "1000",
      triggerPrice: expandDecimals(1000, 30),
      liquidationPriceWhenAlive: expandDecimals(900, 30),
      liquidationPriceWhenLiquidated: expandDecimals(1100, 30),
    },
    {
      name: "short",
      isLong: false,
      triggerPriceInputValue: "1400",
      triggerPrice: expandDecimals(1400, 30),
      liquidationPriceWhenAlive: expandDecimals(1500, 30),
      liquidationPriceWhenLiquidated: expandDecimals(1300, 30),
    },
  ])(
    "$name position",
    ({ isLong, triggerPriceInputValue, triggerPrice, liquidationPriceWhenAlive, liquidationPriceWhenLiquidated }) => {
      it("keeps the existing position in the projection when it survives at the trigger price", () => {
        const state = createState({
          isLong,
          liquidationPrice: liquidationPriceWhenAlive,
          triggerPriceInputValue,
        });

        const increaseAmounts = selectTradeboxIncreasePositionAmounts(state);
        const nextPositionValues = selectTradeboxNextPositionValues(state);

        expect(selectTradeboxIsPositionLiquidatedBeforeTrigger(state)).toBe(false);
        expect(increaseAmounts!.sizeDeltaUsd).toBeGreaterThan(0n);
        expect(nextPositionValues!.nextSizeUsd).toBe(POSITION_SIZE_USD + increaseAmounts!.sizeDeltaUsd);
        expect(nextPositionValues!.nextCollateralUsd).toBeGreaterThan(POSITION_COLLATERAL_USD);
      });

      it("projects a fresh position when the existing one would be liquidated before the trigger price", () => {
        const state = createState({
          isLong,
          liquidationPrice: liquidationPriceWhenLiquidated,
          triggerPriceInputValue,
        });

        const increaseAmounts = selectTradeboxIncreasePositionAmounts(state);
        const nextPositionValues = selectTradeboxNextPositionValues(state);

        expect(selectTradeboxIsPositionLiquidatedBeforeTrigger(state)).toBe(true);
        expect(increaseAmounts!.sizeDeltaUsd).toBeGreaterThan(0n);
        expect(nextPositionValues!.nextSizeUsd).toBe(increaseAmounts!.sizeDeltaUsd);
        expect(nextPositionValues!.nextCollateralUsd).toBeLessThan(POSITION_COLLATERAL_USD);
        expect(nextPositionValues!.nextEntryPrice).toBeGreaterThan((triggerPrice * 95n) / 100n);
        expect(nextPositionValues!.nextEntryPrice).toBeLessThan((triggerPrice * 105n) / 100n);
      });
    }
  );
});
