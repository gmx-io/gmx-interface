/**
 * Replays contract verdicts captured on an Arbitrum fork (rig: .claude/tasks/increase-margin-check-fedev-4131/rig,
 * `dump-fixture.ts`) through the same helpers the trade box uses: `getIncreasePositionAmounts` builds the
 * increase from the deposit, route and trigger, `getIncreaseResultingPositionMarginState` judges the
 * resulting position. Each fixture pins one position state against the gmx-synthetics build deployed on
 * Arbitrum (release_2.2.1 @ 23c9d160: PositionUtils 0x0778…, IncreasePositionUtils 0x00F3…): the largest
 * size the contract executed must pass the check, the first size it rejected must fail it with the same
 * reason. No network — everything the formula reads is inside the JSON (bigints as { "$bigint": "…" }).
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { getCappedPoolPnl, getPoolUsdWithoutPnl, getPositiveMarketPnl, getPriceForPnl } from "sdk/utils/markets";
import type { MarketInfo, MarketsInfoData } from "sdk/utils/markets/types";
import { OrderType, SwapPricingType } from "sdk/utils/orders/types";
import type { PositionInfo } from "sdk/utils/positions/types";
import { getPositionPnlUsd } from "sdk/utils/positions/utils";
import { getIncreaseEvaluationIndexPrice, getMarkPrice } from "sdk/utils/prices";
import { createFindSwapPath } from "sdk/utils/swap/swapPath";
import { convertToTokenAmount, convertToUsd } from "sdk/utils/tokens";
import type { TokenData, TokensData } from "sdk/utils/tokens/types";
import { getIncreasePositionAmounts } from "sdk/utils/trade/increase";
import {
  getIncreaseResultingPositionMarginState,
  PositionMarginFailureReason,
  type PositionMarginState,
} from "sdk/utils/trade/increaseMarginCheck";

const CHAIN_ID = 42161;
const FIXTURES_DIR = path.join(__dirname, "fixtures/margin");
const DEPLOYED_POSITION_UTILS = "0x077887985985eBF1B406263aa175bdB17BF1FEd0";
const DEPLOYED_INCREASE_POSITION_UTILS = "0x00F39bbbBAB35bA47Daa17A18D833350EC398Ff6";
const DEPLOYED_BYTECODE_HASHES = {
  positionUtils: "0x3d8c6f65072f928f3110d47adf94c72bbf08377fda3f1b5298bf363d70642fb8",
  increasePositionUtils: "0x5f9779393cfa31d27a37c400b1710c3e9fa526ce991b3e4daddefb1a47b13460",
};

type FixturePosition = Pick<
  PositionInfo,
  | "key"
  | "marketAddress"
  | "collateralTokenAddress"
  | "isLong"
  | "sizeInUsd"
  | "sizeInTokens"
  | "collateralAmount"
  | "pendingImpactAmount"
  | "pendingBorrowingFeesUsd"
  | "pendingFundingFeesUsd"
  | "fundingFeeAmount"
  | "collateralUsd"
  | "entryPrice"
  | "liquidationPrice"
  | "pnl"
>;

type Fixture = {
  name: string;
  meta: {
    forkBlock: number;
    positionUtils: string;
    increasePositionUtils: string;
    bytecodeHashes: { positionUtils: string; increasePositionUtils: string };
  };
  market: { name: string; marketTokenAddress: string };
  minCollateralUsd: bigint;
  marketsInfoData: MarketsInfoData;
  tokensData: TokensData;
  position: FixturePosition | null;
  order: {
    isLong: boolean;
    orderType: OrderType;
    triggerPrice: bigint | null;
    payTokenAddress: string;
    payAmount: bigint;
    collateralTokenAddress: string;
    swapPath: string[];
    uiFeeFactor: bigint;
    sizeOnly: boolean;
  };
  flip: { largestExecutesUsd: bigint; firstRejectedUsd: bigint; reason: string; precisionUsd: bigint };
};

function reviveBigints(_key: string, value: unknown) {
  if (value && typeof value === "object" && "$bigint" in value) {
    return BigInt((value as { $bigint: string }).$bigint);
  }
  return value;
}

function loadFixtures(): Fixture[] {
  return readdirSync(FIXTURES_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => JSON.parse(readFileSync(path.join(FIXTURES_DIR, file), "utf8"), reviveBigints) as Fixture);
}

const usd = (value: bigint) => `$${(Number(value) / 1e30).toFixed(2)}`;

/** the contract's revert → the reason the check must report; InsufficientCollateralAmount has no counterpart */
function expectedReasons(contractReason: string): PositionMarginFailureReason[] | "any" {
  if (contractReason.startsWith("InsufficientCollateralAmount")) return "any";
  if (contractReason.startsWith("InsufficientCollateralUsd"))
    return [PositionMarginFailureReason.InsufficientCollateralUsd];

  if (contractReason.startsWith("LiquidatablePosition(")) {
    const inner = contractReason.slice("LiquidatablePosition(".length);
    if (inner.startsWith("min collateral for leverage")) return [PositionMarginFailureReason.MinCollateralForLeverage];
    if (inner.startsWith("min collateral")) return [PositionMarginFailureReason.MinCollateral];
    if (inner.startsWith("< 0")) return [PositionMarginFailureReason.NonPositiveRemainingMargin];
  }

  throw new Error(`fixture rejected with a revert the check does not model: ${contractReason}`);
}

type Replay = {
  marketInfo: MarketInfo;
  indexToken: TokenData;
  payToken: TokenData;
  collateralToken: TokenData;
  isLong: boolean;
  limitOrderType: OrderType.LimitIncrease | OrderType.StopIncrease | undefined;
  triggerPrice: bigint | undefined;
  evaluationPrice: bigint;
  isSwap: boolean;
  depositUsd: bigint;
};

function describeReplay(fixture: Fixture, marketsInfoData: MarketsInfoData = fixture.marketsInfoData): Replay {
  const { order } = fixture;
  const marketInfo = marketsInfoData[fixture.market.marketTokenAddress];
  const indexToken = marketInfo.indexToken;
  const payToken = fixture.tokensData[order.payTokenAddress];
  const collateralToken = fixture.tokensData[order.collateralTokenAddress];
  const limitOrderType =
    order.orderType === OrderType.MarketIncrease ? undefined : (order.orderType as Replay["limitOrderType"]);
  const triggerPrice = order.triggerPrice ?? undefined;
  const evaluationPrice =
    limitOrderType !== undefined && triggerPrice !== undefined
      ? triggerPrice
      : getMarkPrice({ prices: indexToken.prices, isIncrease: true, isLong: order.isLong });

  return {
    marketInfo,
    indexToken,
    payToken,
    collateralToken,
    isLong: order.isLong,
    limitOrderType,
    triggerPrice,
    evaluationPrice,
    isSwap: payToken.address !== collateralToken.address,
    depositUsd: convertToUsd(order.payAmount, payToken.decimals, payToken.prices.minPrice)!,
  };
}

/** the increase the way the trade box builds it, then the resulting-position check on it */
function replay(fixture: Fixture, sizeDeltaUsd: bigint, marketsInfoData: MarketsInfoData = fixture.marketsInfoData) {
  const r = describeReplay(fixture, marketsInfoData);
  const { order, position } = fixture;

  const findSwapPath = createFindSwapPath({
    chainId: CHAIN_ID,
    fromTokenAddress: r.payToken.address,
    toTokenAddress: r.collateralToken.address,
    marketsInfoData,
    swapPricingType: SwapPricingType.Swap,
    manualPath: r.isSwap ? order.swapPath : undefined,
  });

  const amounts = getIncreasePositionAmounts({
    strategy: "independent",
    marketInfo: r.marketInfo,
    indexToken: r.indexToken,
    initialCollateralToken: r.payToken,
    collateralToken: r.collateralToken,
    isLong: r.isLong,
    initialCollateralAmount: order.payAmount,
    indexTokenAmount: convertToTokenAmount(sizeDeltaUsd, r.indexToken.decimals, r.evaluationPrice)!,
    triggerPrice: r.triggerPrice,
    limitOrderType: r.limitOrderType,
    position: (position ?? undefined) as PositionInfo | undefined,
    findSwapPath,
    userReferralInfo: undefined,
    proDiscountFactor: 0n,
    uiFeeFactor: order.uiFeeFactor,
    marketsInfoData,
    chainId: CHAIN_ID,
    externalSwapQuote: undefined,
    externalSwapQuoteParams: undefined,
    isSetAcceptablePriceImpactEnabled: false,
  });

  const marginState = getIncreaseResultingPositionMarginState({
    marketInfo: r.marketInfo,
    collateralToken: r.collateralToken,
    isLong: r.isLong,
    existingPosition: position
      ? {
          sizeInUsd: position.sizeInUsd,
          sizeInTokens: position.sizeInTokens,
          collateralAmount: position.collateralAmount,
          pendingImpactAmount: position.pendingImpactAmount,
        }
      : undefined,
    sizeDeltaUsd: amounts.sizeDeltaUsd,
    sizeDeltaInTokens: amounts.sizeDeltaInTokens,
    collateralDeltaAmount: amounts.collateralDeltaAmount,
    minCollateralUsd: fixture.minCollateralUsd,
    userReferralInfo: undefined,
    proDiscountFactor: 0n,
    indexPriceForEvaluation: getIncreaseEvaluationIndexPrice({
      orderType: order.orderType,
      triggerPrice: r.triggerPrice,
    }),
  });

  return { amounts, marginState, replay: r };
}

/** where the check itself flips, bisected to the fixture's precision — for the failure message only */
function findSdkFlip(
  fixture: Fixture
): { largestPassesUsd: bigint; firstFailsUsd: bigint; reason: string | undefined } | string {
  let low = fixture.flip.largestExecutesUsd / 4n;
  let high = fixture.flip.firstRejectedUsd * 4n;

  const liquidatable = (size: bigint) => replay(fixture, size).marginState?.isLiquidatable ?? true;

  if (liquidatable(low)) return `check fails already at ${usd(low)}`;
  if (!liquidatable(high)) return `check still passes at ${usd(high)}`;

  while (high - low > fixture.flip.precisionUsd) {
    const mid = (low + high) / 2n;
    if (liquidatable(mid)) high = mid;
    else low = mid;
  }

  return { largestPassesUsd: low, firstFailsUsd: high, reason: replay(fixture, high).marginState?.reason };
}

function describeState(state: PositionMarginState | undefined) {
  if (!state) return "undefined";
  return `liquidatable=${state.isLiquidatable} reason=${state.reason ?? "-"} remaining=${usd(state.remainingCollateralUsd)} required=${usd(state.minCollateralUsdForLeverage)}`;
}

function boundaryReport(fixture: Fixture) {
  const sdkFlip = findSdkFlip(fixture);
  if (typeof sdkFlip === "string") return sdkFlip;
  const deltaUsd = Number(sdkFlip.firstFailsUsd - fixture.flip.firstRejectedUsd) / 1e30;
  return (
    `sdk flips at ${usd(sdkFlip.largestPassesUsd)} / ${usd(sdkFlip.firstFailsUsd)} (${sdkFlip.reason}), ` +
    `contract at ${usd(fixture.flip.largestExecutesUsd)} / ${usd(fixture.flip.firstRejectedUsd)} (${fixture.flip.reason}), ` +
    `delta ${deltaUsd >= 0 ? "+" : ""}${deltaUsd.toFixed(2)} USD of size`
  );
}

/**
 * The pool pnl on the other price side: the contract maximises the traders' positive pnl, so for a long
 * the pool pnl is valued at the index max price and for a short at the min price. Collapsing the index
 * prices onto the opposite side leaves the position's own mark untouched (a long's pnl already reads
 * the min price, a short's the max) and only moves the denominator of the pnl cap.
 */
function withPoolPnlOnTheOtherSide(fixture: Fixture): MarketsInfoData {
  const marketInfo = fixture.marketsInfoData[fixture.market.marketTokenAddress];
  const indexToken = marketInfo.indexToken;
  const price = fixture.order.isLong ? indexToken.prices.minPrice : indexToken.prices.maxPrice;
  const collapse = (token: TokenData) =>
    token.address === indexToken.address || token.address === indexToken.wrappedAddress
      ? { ...token, prices: { minPrice: price, maxPrice: price } }
      : token;

  return {
    ...fixture.marketsInfoData,
    [marketInfo.marketTokenAddress]: {
      ...marketInfo,
      indexToken: collapse(marketInfo.indexToken),
      longToken: collapse(marketInfo.longToken),
      shortToken: collapse(marketInfo.shortToken),
    },
  };
}

const fixtures = loadFixtures();

describe("resulting-position margin check against contract verdicts captured on a fork", () => {
  it("has fixtures to replay", () => {
    expect(fixtures.length).toBeGreaterThan(0);
  });

  for (const fixture of fixtures) {
    const { flip, order } = fixture;
    const reasons = expectedReasons(flip.reason);
    const label = `${fixture.name} (${fixture.market.name} ${order.isLong ? "long" : "short"}, ${OrderType[order.orderType]}, fork ${fixture.meta.forkBlock})`;

    describe(label, () => {
      it("targets the build deployed on Arbitrum", () => {
        expect(fixture.meta.positionUtils).toBe(DEPLOYED_POSITION_UTILS);
        expect(fixture.meta.increasePositionUtils).toBe(DEPLOYED_INCREASE_POSITION_UTILS);
        expect(fixture.meta.bytecodeHashes).toEqual(DEPLOYED_BYTECODE_HASHES);
      });

      it(`passes at ${usd(flip.largestExecutesUsd)}, the largest size the contract executed`, () => {
        const { marginState, amounts } = replay(fixture, flip.largestExecutesUsd);

        expect(amounts.sizeDeltaUsd).toBeGreaterThan(0n);
        expect(marginState, "the check returned nothing for a positive size").toBeDefined();
        expect(marginState!.isLiquidatable, `${describeState(marginState)}; ${boundaryReport(fixture)}`).toBe(false);
      });

      const rejectTitle =
        reasons === "any"
          ? `fails at ${usd(flip.firstRejectedUsd)}, where the contract reverted with ${flip.reason} — any reason is accepted, the check has no fee-vs-collateral gate`
          : `fails at ${usd(flip.firstRejectedUsd)} with ${reasons.join(" | ")}, where the contract reverted with ${flip.reason}`;

      it(rejectTitle, () => {
        const { marginState } = replay(fixture, flip.firstRejectedUsd);

        expect(marginState, "the check returned nothing for a positive size").toBeDefined();
        expect(marginState!.isLiquidatable, `${describeState(marginState)}; ${boundaryReport(fixture)}`).toBe(true);

        if (reasons !== "any") {
          expect(reasons, `${describeState(marginState)}`).toContain(marginState!.reason);
        }
      });

      const marketInfo = fixture.marketsInfoData[fixture.market.marketTokenAddress];
      const poolPnl = getPositiveMarketPnl(marketInfo, order.isLong, false);
      const cappedPoolPnl = getCappedPoolPnl({
        marketInfo,
        poolUsd: getPoolUsdWithoutPnl(marketInfo, order.isLong, "minPrice"),
        poolPnl,
        isLong: order.isLong,
      });
      const capBinds = poolPnl > 0n && cappedPoolPnl < poolPnl && (fixture.position?.pnl ?? 0n) > 0n;

      if (capBinds) {
        it("values the pool pnl on the contract's price side: remaining margin is strictly lower than with the pool pnl on the other side", () => {
          const asIs = replay(fixture, flip.largestExecutesUsd);
          const otherSide = replay(fixture, flip.largestExecutesUsd, withPoolPnlOnTheOtherSide(fixture));

          const position = fixture.position!;
          const nextSizeInUsd = position.sizeInUsd + asIs.amounts.sizeDeltaUsd;
          const nextSizeInTokens = position.sizeInTokens + asIs.amounts.sizeDeltaInTokens;
          const pnlAsIs = getPositionPnlUsd({
            marketInfo,
            sizeInUsd: nextSizeInUsd,
            sizeInTokens: nextSizeInTokens,
            markPrice: getPriceForPnl(marketInfo.indexToken.prices, order.isLong, false),
            isLong: order.isLong,
          });
          const otherMarketInfo = withPoolPnlOnTheOtherSide(fixture)[marketInfo.marketTokenAddress];
          const pnlOtherSide = getPositionPnlUsd({
            marketInfo: otherMarketInfo,
            sizeInUsd: nextSizeInUsd,
            sizeInTokens: nextSizeInTokens,
            markPrice: getPriceForPnl(marketInfo.indexToken.prices, order.isLong, false),
            isLong: order.isLong,
          });

          expect(pnlAsIs).toBeGreaterThan(0n);
          expect(pnlAsIs, `capped pnl ${usd(pnlAsIs)} vs ${usd(pnlOtherSide)} on the other side`).toBeLessThan(
            pnlOtherSide
          );
          expect(
            asIs.marginState!.remainingCollateralUsd,
            `remaining ${usd(asIs.marginState!.remainingCollateralUsd)} vs ${usd(otherSide.marginState!.remainingCollateralUsd)} on the other side`
          ).toBeLessThan(otherSide.marginState!.remainingCollateralUsd);
        });
      }
    });
  }
});
