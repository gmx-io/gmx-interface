import { getBasisPoints } from "lib/numbers";

import type { RawSolanaPosition, SolanaPositionCalculation, SolanaPositionViewModel } from "./types";
import { getSolanaTokenConfig, GMTRADE_USD_DECIMALS, ONE_GMTRADE_USD } from "../config/solanaProgram";
import type { SolanaMarketInfo, SolanaTicker } from "../markets/solanaMarketSocketStore";
import { solanaDisplaySymbol } from "../wallet/solanaWalletSession";

/** GMX EVM USD decimals, which `lib/numbers` formatters assume. */
const GMX_USD_DECIMALS = 30;
const USD_SCALE = 10n ** BigInt(GMX_USD_DECIMALS - GMTRADE_USD_DECIMALS);
/** SDK leverage carries 20 decimals; `formatLeverage` expects 4. */
const LEVERAGE_SCALE = 10n ** BigInt(GMTRADE_USD_DECIMALS - 4);

/** 20-decimal GMTrade USD → 30-decimal GMX USD. */
export function toGmxUsd(value: bigint): bigint {
  return value * USD_SCALE;
}

/** Price per smallest token unit (20 decimals) → price per whole token (30 decimals). */
export function unitPriceToTokenPrice(unitPrice: bigint, tokenDecimals: number): bigint {
  return unitPrice * 10n ** BigInt(tokenDecimals) * USD_SCALE;
}

export function toGmxLeverage(leverage: bigint): bigint {
  return leverage / LEVERAGE_SCALE;
}

const HOURS_PER_DAY = 24n;

/**
 * Source: gmx-solana-interface PositionItem.tsx collateral tooltip.
 * Fee over 24h at `ratePerHour` (fraction × 1e20) on `sizeInUsd` (20 decimals), in 30-decimal GMX USD.
 * Keeps the rate's sign: negative means the position pays.
 */
export function feePerDayUsd(ratePerHour: bigint | undefined, sizeInUsd: bigint): bigint | undefined {
  if (ratePerHour === undefined) return undefined;
  return toGmxUsd((ratePerHour * HOURS_PER_DAY * sizeInUsd) / ONE_GMTRADE_USD);
}

/** GMTrade shows "> 1000 days" for positions whose fees do not eat into the collateral. */
export const NO_LIQUIDATION_BY_FEES_HOURS = 1001n * 24n;

export type EstimateLiquidationHoursInput = {
  /** All USD values in the same scale (30 decimals here). */
  netValue: bigint;
  sizeInUsd: bigint;
  /** Fraction × 1e20 (GMTrade `minCollateralFactorForLong/Short`). */
  minCollateralFactor?: bigint;
  /** Signed daily fees, negative = the position pays. */
  borrowingFeePerDay?: bigint;
  fundingFeePerDay?: bigint;
};

/**
 * Source: gmx-solana-interface PositionItem.tsx `renderLiquidationPrice`:
 * (net value - min collateral) / (borrowing + funding fee per day), in hours. Positive results
 * mean the position earns fees (or is already under margin) and are mapped to "never".
 * Deviations from the reference: the long side also scales the factor by 1e20 (the reference
 * omits that division for longs), and the result keeps hour precision instead of whole days.
 */
export function estimateLiquidationHours(input: EstimateLiquidationHoursInput): bigint | undefined {
  const { minCollateralFactor, borrowingFeePerDay, fundingFeePerDay } = input;
  if (minCollateralFactor === undefined || borrowingFeePerDay === undefined || fundingFeePerDay === undefined) {
    return undefined;
  }
  const feesPerDay = borrowingFeePerDay + fundingFeePerDay;
  if (feesPerDay === 0n) return NO_LIQUIDATION_BY_FEES_HOURS;
  const minCollateralUsd = (minCollateralFactor * input.sizeInUsd) / ONE_GMTRADE_USD;
  const hours = ((input.netValue - minCollateralUsd) * HOURS_PER_DAY) / feesPerDay;
  return hours > 0n ? NO_LIQUIDATION_BY_FEES_HOURS : -hours;
}

/** Source: gmx-solana-interface PositionItem.tsx "Pool" row. Undefined when either token is unknown. */
export function getSolanaPoolName(marketInfo: SolanaMarketInfo | undefined): string | undefined {
  if (!marketInfo) return undefined;
  const long = getSolanaTokenConfig(marketInfo.longToken)?.symbol;
  const short = getSolanaTokenConfig(marketInfo.shortToken)?.symbol;
  if (!long || !short) return undefined;
  if (marketInfo.longToken === marketInfo.shortToken) return solanaDisplaySymbol(long);
  return `${solanaDisplaySymbol(long)}-${solanaDisplaySymbol(short)}`;
}

export function shortenAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

function abs(value: bigint): bigint {
  return value < 0n ? -value : value;
}

export function toSolanaPositionViewModel(
  raw: RawSolanaPosition,
  calculation: SolanaPositionCalculation,
  marketInfo: SolanaMarketInfo | undefined,
  indexTicker: SolanaTicker | undefined,
  collateralTicker?: SolanaTicker
): SolanaPositionViewModel {
  const indexToken = getSolanaTokenConfig(marketInfo?.indexToken);
  const collateralToken = getSolanaTokenConfig(raw.collateralToken);
  const symbol = indexToken?.displaySymbol ?? indexToken?.symbol ?? shortenAddress(raw.marketToken);
  const displayMarketName =
    indexToken?.displayMarketName ?? (indexToken ? `${symbol}/USD` : shortenAddress(raw.marketToken));

  const base: SolanaPositionViewModel = {
    key: raw.pubkey,
    positionAddress: raw.pubkey,
    ownerAddress: raw.owner,
    marketTokenAddress: raw.marketToken,
    collateralTokenAddress: raw.collateralToken,
    symbol,
    displayMarketName,
    poolName: getSolanaPoolName(marketInfo),
    isLong: raw.isLong,
    sizeInUsd: toGmxUsd(raw.sizeInUsd),
    sizeInTokens: raw.sizeInTokens,
    indexTokenDecimals: indexToken?.decimals,
    collateralAmount: raw.collateralAmount,
    collateralSymbol: collateralToken?.displaySymbol ?? collateralToken?.symbol ?? shortenAddress(raw.collateralToken),
    collateralDecimals: collateralToken?.decimals,
    increasedAt: raw.increasedAt,
    updatedAtSlot: raw.updatedAtSlot,
    priceUnavailable: calculation.priceUnavailable,
    unavailableReason: calculation.unavailableReason,
    borrowingFeePerDay: feePerDayUsd(
      raw.isLong ? marketInfo?.longBorrowingFeeRateHour : marketInfo?.shortBorrowingFeeRateHour,
      raw.sizeInUsd
    ),
    fundingFeePerDay: feePerDayUsd(
      raw.isLong ? marketInfo?.longFundingFeeRateHour : marketInfo?.shortFundingFeeRateHour,
      raw.sizeInUsd
    ),
  };

  if (indexToken && indexTicker?.price !== undefined) {
    base.markPrice = toGmxUsd(indexTicker.price);
  }

  const status = calculation.status;
  if (!status || !indexToken) return base;

  const noLiquidationPriceReason =
    status.liquidationPrice !== undefined
      ? undefined
      : !raw.isLong && raw.collateralAmount >= raw.sizeInTokens
        ? "short-collateral-covers-size"
        : raw.isLong && collateralToken?.isStable && status.collateralValue >= raw.sizeInUsd
          ? "long-stable-collateral-covers-size"
          : undefined;

  const borrowingFee = abs(status.pendingBorrowingFeeValue);
  const fundingFee = abs(status.pendingFundingFeeValue);
  const pnlAfterFees = status.pendingPnl - borrowingFee - fundingFee - status.closeOrderFeeValue;
  const pnlDenominator = status.collateralValue + status.closeOrderFeeValue;
  // GMTrade "margin": initial collateral after accrued fees; claimable funding is not added back.
  const netCollateralValue = status.collateralValue - borrowingFee - fundingFee;
  const collateralUnitPrice = collateralTicker?.unitPrice;
  const claimableFundingFee =
    status.pendingClaimableFundingFeeValueInLongToken + status.pendingClaimableFundingFeeValueInShortToken;

  return {
    ...base,
    collateralValue: toGmxUsd(status.collateralValue),
    netCollateralValue: toGmxUsd(netCollateralValue),
    netCollateralAmount:
      collateralUnitPrice !== undefined && collateralUnitPrice > 0n
        ? netCollateralValue / collateralUnitPrice
        : undefined,
    entryPrice: unitPriceToTokenPrice(status.entryPrice, indexToken.decimals),
    liquidationPrice:
      status.liquidationPrice === undefined
        ? undefined
        : unitPriceToTokenPrice(status.liquidationPrice, indexToken.decimals),
    pendingPnl: toGmxUsd(status.pendingPnl),
    // GMTrade PositionItem `pnlPercentage`: zero collateral yields 0 rather than no percentage.
    pendingPnlBps: status.collateralValue > 0n ? getBasisPoints(status.pendingPnl, status.collateralValue) : 0n,
    pnlAfterFees: toGmxUsd(pnlAfterFees),
    pnlAfterFeesBps: pnlDenominator > 0n ? getBasisPoints(pnlAfterFees, pnlDenominator) : undefined,
    netValue: toGmxUsd(status.netValue),
    leverage: status.leverage === undefined ? undefined : toGmxLeverage(status.leverage),
    pendingBorrowingFee: toGmxUsd(borrowingFee),
    pendingFundingFee: toGmxUsd(fundingFee),
    pendingClaimableFundingFee: toGmxUsd(claimableFundingFee),
    closeOrderFee: toGmxUsd(status.closeOrderFeeValue),
    estimatedLiquidationHours: estimateLiquidationHours({
      netValue: toGmxUsd(status.netValue),
      sizeInUsd: base.sizeInUsd,
      minCollateralFactor: raw.isLong
        ? marketInfo?.minCollateralFactorForLong
        : marketInfo?.minCollateralFactorForShort,
      borrowingFeePerDay: base.borrowingFeePerDay,
      fundingFeePerDay: base.fundingFeePerDay,
    }),
    noLiquidationPriceReason,
  };
}
