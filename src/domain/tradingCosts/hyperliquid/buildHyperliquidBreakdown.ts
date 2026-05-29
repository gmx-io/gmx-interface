import { sumTradingCostComponents } from "../costs";
import type {
  ComparisonVenueMarket,
  MatchedTradingMarket,
  TradingCostBreakdown,
  TradingCostComponent,
  TradingCostScenario,
} from "../types";
import {
  getBookSideForLeg,
  getHyperliquidExecutionImpactUsd,
  getHyperliquidFundingCostUsd,
  simulateL2BookFill,
} from "./book";
import type { BookSide, HyperliquidBookBundle, HyperliquidL2BookResponse, HyperliquidNormalizedMarket } from "./types";

const AGGREGATED_BOOK_WARNING =
  "Using aggregated Hyperliquid book depth because the default 20-level book cannot fill the requested round-trip size.";

export function getHyperliquidVenueMarkets(markets: HyperliquidNormalizedMarket[]): ComparisonVenueMarket[] {
  return markets.map((market) => ({
    providerId: "hyperliquid",
    symbol: market.symbol,
    displayName: market.displayName,
    volume24hUsd: market.volume24hUsd,
    isDisabled: market.isDisabled,
  }));
}

export function buildHyperliquidBreakdown({
  scenario,
  match: _match,
  market,
  book,
}: {
  scenario: TradingCostScenario;
  match: MatchedTradingMarket;
  market: HyperliquidNormalizedMarket | undefined;
  book: HyperliquidBookBundle | undefined;
}): TradingCostBreakdown {
  if (!market) {
    return {
      providerId: "hyperliquid",
      totalUsd: undefined,
      components: [],
      timestamp: undefined,
      status: "loading",
      warnings: [],
    };
  }

  if (!book) {
    return {
      providerId: "hyperliquid",
      totalUsd: undefined,
      components: [],
      timestamp: market.timestamp,
      status: "loading",
      warnings: [],
    };
  }

  if (book.default instanceof Error && book.aggregated instanceof Error) {
    return {
      providerId: "hyperliquid",
      totalUsd: undefined,
      components: [],
      timestamp: market.timestamp,
      status: "providerError",
      warnings: [book.default.message, book.aggregated.message],
    };
  }

  const referencePrice = market.midPrice ?? market.markPrice;
  const hourlyFundingRate = market.hourlyFundingRate;

  if (!referencePrice || hourlyFundingRate === undefined) {
    return {
      providerId: "hyperliquid",
      totalUsd: undefined,
      components: [],
      timestamp: market.timestamp,
      status: "providerError",
      warnings: ["Hyperliquid market context is missing price or funding data."],
    };
  }

  const openBookSide = getBookSideForLeg({ tradingSide: scenario.side, isOpen: true });
  const closeBookSide = getBookSideForLeg({ tradingSide: scenario.side, isOpen: false });
  const defaultBook = book.default instanceof Error ? undefined : book.default;
  const aggregatedBook = book.aggregated instanceof Error ? undefined : book.aggregated;
  const defaultEvaluation = defaultBook
    ? evaluateBook({ book: defaultBook, scenario, referencePrice, openBookSide, closeBookSide })
    : undefined;
  const aggregatedEvaluation = aggregatedBook
    ? evaluateBook({ book: aggregatedBook, scenario, referencePrice, openBookSide, closeBookSide })
    : undefined;
  const evaluation =
    defaultEvaluation?.isFilled || !aggregatedEvaluation?.isFilled ? defaultEvaluation : aggregatedEvaluation;
  const warnings = evaluation === aggregatedEvaluation ? [AGGREGATED_BOOK_WARNING] : [];

  if (
    !evaluation?.isFilled ||
    evaluation.openFill.averagePrice === undefined ||
    evaluation.closeFill.averagePrice === undefined
  ) {
    return {
      providerId: "hyperliquid",
      totalUsd: undefined,
      components: [],
      timestamp: defaultBook?.time ?? aggregatedBook?.time ?? market.timestamp,
      status: "insufficientDepth",
      warnings: ["Hyperliquid L2 levels cannot fill the requested round-trip size."],
    };
  }

  const feeRate = scenario.venueAssumptions.hyperliquid.takerFeeRate;
  const protocolFeeUsd = (scenario.sizeUsd * BigInt(Math.round(feeRate * 1_000_000)) * 2n) / 1_000_000n;
  const openImpactUsd = getHyperliquidExecutionImpactUsd({
    sizeUsd: scenario.sizeUsd,
    referencePrice,
    averagePrice: evaluation.openFill.averagePrice,
    side: openBookSide,
  });
  const closeImpactUsd = getHyperliquidExecutionImpactUsd({
    sizeUsd: scenario.sizeUsd,
    referencePrice,
    averagePrice: evaluation.closeFill.averagePrice,
    side: closeBookSide,
  });
  const fundingUsd = getHyperliquidFundingCostUsd({
    sizeUsd: scenario.sizeUsd,
    side: scenario.side,
    hourlyFundingRate,
    holdingPeriodHours: scenario.holdingPeriodHours,
  });

  const components: TradingCostComponent[] = [
    { key: "protocolFee", label: "Venue fee", usd: protocolFeeUsd },
    { key: "venueExecutionImpact", label: "Open execution impact", usd: openImpactUsd },
    { key: "venueExecutionImpact", label: "Close execution impact", usd: closeImpactUsd },
    { key: "funding", label: "Funding", usd: fundingUsd },
    { key: "networkFee", label: "Network fee", usd: 0n },
  ];

  return {
    providerId: "hyperliquid",
    totalUsd: sumTradingCostComponents(components),
    components,
    timestamp: evaluation.book.time,
    status: "ready",
    warnings,
  };
}

function evaluateBook({
  book,
  scenario,
  referencePrice,
  openBookSide,
  closeBookSide,
}: {
  book: HyperliquidL2BookResponse;
  scenario: TradingCostScenario;
  referencePrice: number;
  openBookSide: BookSide;
  closeBookSide: BookSide;
}) {
  const openLevels = openBookSide === "bid" ? book.levels[0] : book.levels[1];
  const closeLevels = closeBookSide === "bid" ? book.levels[0] : book.levels[1];
  const openFill = simulateL2BookFill({ levels: openLevels, sizeUsd: scenario.sizeUsd, referencePrice });
  const closeFill = simulateL2BookFill({ levels: closeLevels, sizeUsd: scenario.sizeUsd, referencePrice });

  return {
    book,
    openFill,
    closeFill,
    isFilled:
      openFill.status !== "insufficientDepth" &&
      closeFill.status !== "insufficientDepth" &&
      openFill.averagePrice !== undefined &&
      closeFill.averagePrice !== undefined,
  };
}
