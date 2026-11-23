import { describe, expect, it } from "vitest";

import { ARBITRUM } from "configs/chains";
import { BASIS_POINTS_DIVISOR_BIGINT, USD_DECIMALS } from "configs/factors";
import { getNativeToken, getTokenBySymbol, getWrappedToken } from "configs/tokens";
import { bigMath } from "utils/bigmath";
import { mockMarketsInfoData } from "utils/markets/__tests__/mockMarkets";
import { MarketInfo, MarketsInfoData } from "utils/markets/types";
import { applyFactor, expandDecimals } from "utils/numbers";
import { OrderType, SwapPricingType } from "utils/orders/types";
import {
  getCollateralAmountInIndexTokens,
  getCollateralPriceAtIndexPrice,
  getLiquidationPrice,
  getLiquidationPriceImpactDeltaUsd,
  getPositionInfo,
} from "utils/positions";
import { PositionInfoLoaded } from "utils/positions/types";
import { getSwapPathStats } from "utils/swap";
import { convertToTokenAmount, convertToUsd } from "utils/tokens";
import { Token, TokenData } from "utils/tokens/types";
import { getDecreasePositionAmounts } from "utils/trade/decrease";
import { getIncreasePositionAmounts } from "utils/trade/increase";
import { getMarketInfoAtIndexPrice } from "utils/trade/increaseMarginCheck";

const usd = (value: number) => expandDecimals(Math.round(value * 1e6), USD_DECIMALS - 6);
const amount = (value: number, decimals: number) =>
  (BigInt(Math.round(value * 1e8)) * expandDecimals(1, decimals)) / 100_000_000n;
const isWithinBps = (value: bigint, expected: bigint, bps: bigint) =>
  bigMath.abs(value - expected) * 10_000n <= bigMath.abs(expected) * bps;

const withPrices = (token: Token, minPrice: number, maxPrice: number): TokenData => ({
  ...token,
  prices: { minPrice: usd(minPrice), maxPrice: usd(maxPrice) },
});
const atPrice = <T extends TokenData>(token: T, price: bigint): T => ({
  ...token,
  prices: { minPrice: price, maxPrice: price },
});

const BTC = withPrices(getTokenBySymbol(ARBITRUM, "BTC", { isSynthetic: true }), 99_990, 100_010);
const TBTC = withPrices(getTokenBySymbol(ARBITRUM, "TBTC"), 99_900, 99_950);
const ETH = withPrices(getNativeToken(ARBITRUM), 2_400, 2_400.5);
const WETH = withPrices(getWrappedToken(ARBITRUM), 2_400, 2_400.5);
const WSTETH = withPrices(getTokenBySymbol(ARBITRUM, "WSTETH"), 2_900, 2_901);
const USDC = withPrices(getTokenBySymbol(ARBITRUM, "USDC"), 1, 1);
const USDE = withPrices(getTokenBySymbol(ARBITRUM, "USDE"), 1, 1);

const MIN_COLLATERAL_FACTOR_FOR_LIQUIDATION = expandDecimals(5, 27);
const POSITION_FEE_FACTOR = expandDecimals(7, 26);
const MIN_COLLATERAL_USD = usd(1);

function getMarketInfo(indexToken: TokenData, longToken: TokenData, shortToken: TokenData): MarketInfo {
  const tokensData = Object.fromEntries([indexToken, longToken, shortToken].map((token) => [token.address, token]));
  const key = `${indexToken.address}-${longToken.address}-${shortToken.address}`;

  return mockMarketsInfoData(tokensData, [key], {
    [key]: {
      minCollateralFactorForLiquidation: MIN_COLLATERAL_FACTOR_FOR_LIQUIDATION,
      positionFeeFactorForBalanceWasImproved: POSITION_FEE_FACTOR,
      positionFeeFactorForBalanceWasNotImproved: POSITION_FEE_FACTOR,
      maxPositionImpactFactorForLiquidations: expandDecimals(1, 28),
    },
  })[key];
}

// how the oracle prices the collateral when the index moves: tBTC and wstETH proportionally,
// the index token itself 1:1, stablecoins not at all
type CollateralMoves = "ratio" | "index" | "none";

describe("tBTC and wstETH collateral", () => {
  it("returns the index price where the contract's remaining collateral reaches the liquidation threshold TRD-41", () => {
    const cases: {
      name: string;
      market: [TokenData, TokenData, TokenData];
      collateral: TokenData;
      moves: CollateralMoves;
      isLong: boolean;
      sizeUsd: number;
      collateralAmount: number;
      fundingUsd: number;
      borrowingUsd: number;
    }[] = [
      {
        name: "tBTC long",
        market: [BTC, TBTC, TBTC],
        collateral: TBTC,
        moves: "ratio",
        isLong: true,
        sizeUsd: 50_000,
        collateralAmount: 0.25,
        fundingUsd: 2_500,
        borrowingUsd: 300,
      },
      {
        name: "tBTC short",
        market: [BTC, TBTC, TBTC],
        collateral: TBTC,
        moves: "ratio",
        isLong: false,
        sizeUsd: 30_000,
        collateralAmount: 0.1,
        fundingUsd: 1_000,
        borrowingUsd: 100,
      },
      {
        name: "wstETH long",
        market: [ETH, WSTETH, USDE],
        collateral: WSTETH,
        moves: "ratio",
        isLong: true,
        sizeUsd: 5_000,
        collateralAmount: 500 / 2_900,
        fundingUsd: 50,
        borrowingUsd: 5,
      },
      {
        name: "wstETH short",
        market: [ETH, WSTETH, USDE],
        collateral: WSTETH,
        moves: "ratio",
        isLong: false,
        sizeUsd: 10_000,
        collateralAmount: 2_000 / 2_900,
        fundingUsd: 200,
        borrowingUsd: 20,
      },
      {
        name: "WETH long",
        market: [ETH, WETH, USDC],
        collateral: WETH,
        moves: "index",
        isLong: true,
        sizeUsd: 12_000,
        collateralAmount: 1,
        fundingUsd: 0,
        borrowingUsd: 30,
      },
      {
        name: "USDC long",
        market: [ETH, WETH, USDC],
        collateral: USDC,
        moves: "none",
        isLong: true,
        sizeUsd: 10_000,
        collateralAmount: 2_000,
        fundingUsd: 100,
        borrowingUsd: 20,
      },
    ];

    for (const c of cases) {
      const [indexToken, longToken, shortToken] = c.market;
      const marketInfo = getMarketInfo(indexToken, longToken, shortToken);
      const indexPrecision = expandDecimals(1, indexToken.decimals);
      const collateralPrecision = expandDecimals(1, c.collateral.decimals);
      const currentIndexPrice = c.isLong ? indexToken.prices.minPrice : indexToken.prices.maxPrice;

      const sizeInUsd = usd(c.sizeUsd);
      const sizeInTokens = (sizeInUsd * indexPrecision) / currentIndexPrice;
      const collateralAmount = amount(c.collateralAmount, c.collateral.decimals);
      const collateralUsd = (collateralAmount * c.collateral.prices.minPrice) / collateralPrecision;
      const pendingFundingFeesUsd = usd(c.fundingUsd);
      const pendingBorrowingFeesUsd = usd(c.borrowingUsd);

      const liquidationPrice = getLiquidationPrice({
        sizeInUsd,
        sizeInTokens,
        collateralAmount,
        collateralUsd,
        collateralToken: c.collateral,
        marketInfo,
        pendingFundingFeesUsd,
        pendingBorrowingFeesUsd,
        pendingImpactAmount: 0n,
        minCollateralUsd: MIN_COLLATERAL_USD,
        isLong: c.isLong,
        useMaxPriceImpact: true,
        userReferralInfo: undefined,
      });

      expect(liquidationPrice, c.name).toBeDefined();

      const priceImpactUsd = getLiquidationPriceImpactDeltaUsd({
        marketInfo,
        sizeInUsd,
        sizeInTokens,
        pendingImpactAmount: 0n,
        isLong: c.isLong,
        useMaxPriceImpact: true,
      });

      // funding fees are held in collateral tokens, borrowing and closing fees are USD amounts
      const getRemainingCollateralUsd = (indexPrice: bigint) => {
        const collateralPrice = {
          none: c.collateral.prices.minPrice,
          index: indexPrice,
          ratio: (c.collateral.prices.minPrice * indexPrice) / currentIndexPrice,
        }[c.moves];
        const fundingUsd = (pendingFundingFeesUsd * collateralPrice) / c.collateral.prices.minPrice;
        const positionValueUsd = (sizeInTokens * indexPrice) / indexPrecision;
        const pnlUsd = c.isLong ? positionValueUsd - sizeInUsd : sizeInUsd - positionValueUsd;

        return (
          (collateralAmount * collateralPrice) / collateralPrecision -
          fundingUsd -
          pendingBorrowingFeesUsd -
          applyFactor(sizeInUsd, POSITION_FEE_FACTOR) +
          priceImpactUsd +
          pnlUsd
        );
      };

      const threshold = applyFactor(sizeInUsd, MIN_COLLATERAL_FACTOR_FOR_LIQUIDATION);
      const safeSide = c.isLong ? 10_001n : 9_999n;
      const liquidatableSide = c.isLong ? 9_999n : 10_001n;

      expect(getRemainingCollateralUsd((liquidationPrice! * safeSide) / 10_000n) > threshold, c.name).toBe(true);
      expect(getRemainingCollateralUsd((liquidationPrice! * liquidatableSide) / 10_000n) < threshold, c.name).toBe(
        true
      );
    }
  });

  it("values tBTC and wstETH collateral at the trigger price for TP/SL TRD-41", () => {
    const cases: {
      name: string;
      market: [TokenData, TokenData, TokenData];
      collateral: TokenData;
      moves: CollateralMoves;
      isLong: boolean;
    }[] = [
      { name: "tBTC long", market: [BTC, TBTC, TBTC], collateral: TBTC, moves: "ratio", isLong: true },
      { name: "tBTC short", market: [BTC, TBTC, TBTC], collateral: TBTC, moves: "ratio", isLong: false },
      { name: "wstETH long", market: [ETH, WSTETH, USDE], collateral: WSTETH, moves: "ratio", isLong: true },
      { name: "WETH long", market: [ETH, WETH, USDC], collateral: WETH, moves: "index", isLong: true },
      { name: "USDC short", market: [ETH, WETH, USDC], collateral: USDC, moves: "none", isLong: false },
    ];

    for (const c of cases) {
      const [indexToken] = c.market;
      const marketInfo = getMarketInfo(...c.market);
      const currentIndexPrice = c.isLong ? indexToken.prices.minPrice : indexToken.prices.maxPrice;
      const triggerPrice = (currentIndexPrice * 8n) / 10n;
      const collateralAmount = convertToTokenAmount(usd(3_000), c.collateral.decimals, c.collateral.prices.minPrice)!;
      const sizeInUsd = usd(9_000);

      const expectedCollateralPrice = {
        none: c.collateral.prices.minPrice,
        index: triggerPrice,
        ratio: (c.collateral.prices.minPrice * triggerPrice) / currentIndexPrice,
      }[c.moves];

      const position = getPositionInfo({
        position: {
          key: c.name,
          contractKey: c.name,
          account: "",
          marketAddress: marketInfo.marketTokenAddress,
          collateralTokenAddress: c.collateral.address,
          sizeInUsd,
          sizeInTokens: convertToTokenAmount(sizeInUsd, indexToken.decimals, currentIndexPrice)!,
          collateralAmount,
          pendingBorrowingFeesUsd: 0n,
          increasedAtTime: 0n,
          decreasedAtTime: 0n,
          isLong: c.isLong,
          fundingFeeAmount: 0n,
          claimableLongTokenAmount: 0n,
          claimableShortTokenAmount: 0n,
          pnl: 0n,
          positionFeeAmount: 0n,
          traderDiscountAmount: 0n,
          uiFeeAmount: 0n,
          pendingImpactAmount: 0n,
          positionValueInUsd: 0n,
          data: "",
        },
        marketInfo,
        minCollateralUsd: MIN_COLLATERAL_USD,
      }) as PositionInfoLoaded;

      const decreaseAmounts = getDecreasePositionAmounts({
        marketInfo,
        collateralToken: c.collateral,
        isLong: c.isLong,
        position,
        closeSizeUsd: sizeInUsd / 2n,
        keepLeverage: true,
        triggerPrice,
        triggerOrderType: c.isLong ? OrderType.StopLossDecrease : OrderType.LimitDecrease,
        userReferralInfo: undefined,
        minCollateralUsd: MIN_COLLATERAL_USD,
        minPositionSizeUsd: 0n,
        uiFeeFactor: 0n,
        isSetAcceptablePriceImpactEnabled: false,
      });

      expect(decreaseAmounts.collateralPrice, c.name).toBe(expectedCollateralPrice);

      // Loss % and Gain % value the collateral as index tokens at the trigger price
      const collateralInIndexTokens = getCollateralAmountInIndexTokens({
        collateralToken: c.collateral,
        indexToken,
        collateralAmount,
        isLong: c.isLong,
      });

      if (c.moves === "none") {
        expect(collateralInIndexTokens, c.name).toBeUndefined();
        continue;
      }

      const valueInIndexTokens = convertToUsd(collateralInIndexTokens!, indexToken.decimals, triggerPrice)!;
      const collateralValueAtTrigger = convertToUsd(collateralAmount, c.collateral.decimals, expectedCollateralPrice)!;

      expect(isWithinBps(valueInIndexTokens, collateralValueAtTrigger, 1n), c.name).toBe(true);
    }

    expect(
      getCollateralPriceAtIndexPrice({
        collateralToken: TBTC,
        indexToken: withPrices(BTC, 0, 0),
        indexPrice: usd(80_000),
        isLong: true,
      })
    ).toBe(TBTC.prices.minPrice);
    expect(
      getCollateralPriceAtIndexPrice({ collateralToken: TBTC, indexToken: ETH, indexPrice: usd(2_000), isLong: true })
    ).toBe(TBTC.prices.minPrice);
  });

  it("values tBTC and wstETH collateral at the trigger price in limit increase orders TRD-41", () => {
    const leverage = 5n * BASIS_POINTS_DIVISOR_BIGINT;
    const depositUsd = usd(100);

    const cases: {
      name: string;
      market: [TokenData, TokenData, TokenData];
      payToken: TokenData;
      collateral: TokenData;
      isLong: boolean;
      triggerBps: bigint;
    }[] = [
      {
        name: "wstETH short paid in USDe",
        market: [ETH, WSTETH, USDE],
        payToken: USDE,
        collateral: WSTETH,
        isLong: false,
        triggerBps: 11_000n,
      },
      {
        name: "wstETH long paid in USDe",
        market: [ETH, WSTETH, USDE],
        payToken: USDE,
        collateral: WSTETH,
        isLong: true,
        triggerBps: 9_000n,
      },
      {
        name: "wstETH short paid in wstETH",
        market: [ETH, WSTETH, USDE],
        payToken: WSTETH,
        collateral: WSTETH,
        isLong: false,
        triggerBps: 11_000n,
      },
      {
        name: "tBTC long paid in tBTC",
        market: [BTC, TBTC, TBTC],
        payToken: TBTC,
        collateral: TBTC,
        isLong: true,
        triggerBps: 9_000n,
      },
    ];

    for (const c of cases) {
      const [indexToken] = c.market;
      const marketInfo = getMarketInfo(...c.market);
      const marketsInfoData: MarketsInfoData = { [marketInfo.marketTokenAddress]: marketInfo };
      const currentIndexPrice = c.isLong ? indexToken.prices.minPrice : indexToken.prices.maxPrice;
      const triggerPrice = (currentIndexPrice * c.triggerBps) / 10_000n;
      const collateralPriceAtTrigger = (c.collateral.prices.minPrice * triggerPrice) / currentIndexPrice;
      const collateralMaxPriceAtTrigger = (c.collateral.prices.maxPrice * triggerPrice) / currentIndexPrice;
      const payAmount = convertToTokenAmount(depositUsd, c.payToken.decimals, c.payToken.prices.minPrice)!;
      const isSwap = c.payToken.address !== c.collateral.address;

      const getSwapStats = (markets: MarketsInfoData, usdIn: bigint) =>
        getSwapPathStats({
          marketsInfoData: markets,
          swapPath: [marketInfo.marketTokenAddress],
          initialCollateralAddress: c.payToken.address,
          wrappedNativeTokenAddress: WETH.address,
          usdIn,
          shouldUnwrapNativeToken: false,
          shouldApplyPriceImpact: true,
          swapPricingType: SwapPricingType.Swap,
        });

      const increaseAmounts = getIncreasePositionAmounts({
        marketInfo,
        indexToken,
        initialCollateralToken: c.payToken,
        collateralToken: c.collateral,
        isLong: c.isLong,
        initialCollateralAmount: payAmount,
        indexTokenAmount: undefined,
        position: undefined,
        externalSwapQuote: undefined,
        userReferralInfo: undefined,
        strategy: "leverageByCollateral",
        leverage,
        triggerPrice,
        limitOrderType: OrderType.LimitIncrease,
        findSwapPath: ((usdIn: bigint) => (isSwap ? getSwapStats(marketsInfoData, usdIn) : undefined)) as never,
        uiFeeFactor: 0n,
        marketsInfoData,
        chainId: ARBITRUM,
        externalSwapQuoteParams: undefined,
        isSetAcceptablePriceImpactEnabled: false,
      });

      // the keeper executes at the trigger: the collateral and its oracle spread are repriced with the index,
      // and the swap pays out at the collateral's max price
      const atTrigger = (token: TokenData) =>
        token.address === c.collateral.address
          ? { ...token, prices: { minPrice: collateralPriceAtTrigger, maxPrice: collateralMaxPriceAtTrigger } }
          : token;
      const marketAtTrigger: MarketInfo = {
        ...marketInfo,
        indexToken: atPrice(indexToken, triggerPrice),
        longToken: atTrigger(marketInfo.longToken),
        shortToken: atTrigger(marketInfo.shortToken),
      };
      const collateralAmountAtExecution = isSwap
        ? getSwapStats({ [marketInfo.marketTokenAddress]: marketAtTrigger }, depositUsd)!.amountOut
        : payAmount;
      const collateralUsdAtExecution =
        convertToUsd(collateralAmountAtExecution, c.collateral.decimals, collateralPriceAtTrigger)! -
        increaseAmounts.positionFeeUsd;

      expect(
        isWithinBps(
          increaseAmounts.collateralDeltaAmount,
          convertToTokenAmount(collateralUsdAtExecution, c.collateral.decimals, collateralPriceAtTrigger)!,
          1n
        ),
        c.name
      ).toBe(true);
      expect(
        isWithinBps(
          increaseAmounts.sizeDeltaUsd,
          bigMath.mulDiv(collateralUsdAtExecution, leverage, BASIS_POINTS_DIVISOR_BIGINT),
          1n
        ),
        c.name
      ).toBe(true);

      const { collateralToken: collateralAtEvaluation } = getMarketInfoAtIndexPrice({
        marketInfo,
        collateralToken: c.collateral,
        indexPrice: triggerPrice,
        isLong: c.isLong,
      });

      expect(collateralAtEvaluation.prices, c.name).toEqual({
        minPrice: collateralPriceAtTrigger,
        maxPrice: collateralMaxPriceAtTrigger,
      });
    }

    // a stablecoin collateral keeps its prices at the trigger, and so does the wstETH the position does not hold
    const usdeWithSpread = withPrices(USDE, 0.999, 1.001);
    const atTrigger = getMarketInfoAtIndexPrice({
      marketInfo: getMarketInfo(ETH, WSTETH, usdeWithSpread),
      collateralToken: usdeWithSpread,
      indexPrice: usd(2_640),
      isLong: false,
    });

    expect(atTrigger.collateralToken.prices).toEqual(usdeWithSpread.prices);
    expect(atTrigger.marketInfo.longToken.prices).toEqual(WSTETH.prices);
    expect(atTrigger.marketInfo.indexToken.prices).toEqual({ minPrice: usd(2_640), maxPrice: usd(2_640) });

    // the index price is not loaded yet: wstETH keeps its prices
    const withoutIndexPrice = getMarketInfoAtIndexPrice({
      marketInfo: { ...getMarketInfo(ETH, WSTETH, USDE), indexToken: withPrices(ETH, 0, 0) },
      collateralToken: WSTETH,
      indexPrice: usd(2_640),
      isLong: true,
    });

    expect(withoutIndexPrice.collateralToken.prices).toEqual(WSTETH.prices);
  });
});
