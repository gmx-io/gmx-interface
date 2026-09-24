import { getBasisPoints } from "lib/numbers";

import type { RawSolanaPosition, SolanaPositionCalculation, SolanaPositionViewModel } from "./types";
import { getSolanaTokenConfig, GMTRADE_USD_DECIMALS } from "../config/solanaProgram";
import type { SolanaMarketInfo, SolanaTicker } from "../markets/solanaMarketSocketStore";

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
  indexTicker: SolanaTicker | undefined
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
  };

  if (indexToken && indexTicker?.price !== undefined) {
    base.markPrice = toGmxUsd(indexTicker.price);
  }

  const status = calculation.status;
  if (!status || !indexToken) return base;

  const borrowingFee = abs(status.pendingBorrowingFeeValue);
  const fundingFee = abs(status.pendingFundingFeeValue);
  const pnlAfterFees = status.pendingPnl - borrowingFee - fundingFee - status.closeOrderFeeValue;
  const pnlDenominator = status.collateralValue + status.closeOrderFeeValue;

  return {
    ...base,
    collateralValue: toGmxUsd(status.collateralValue),
    entryPrice: unitPriceToTokenPrice(status.entryPrice, indexToken.decimals),
    liquidationPrice:
      status.liquidationPrice === undefined
        ? undefined
        : unitPriceToTokenPrice(status.liquidationPrice, indexToken.decimals),
    pendingPnl: toGmxUsd(status.pendingPnl),
    pnlAfterFees: toGmxUsd(pnlAfterFees),
    pnlAfterFeesBps: pnlDenominator > 0n ? getBasisPoints(pnlAfterFees, pnlDenominator) : undefined,
    netValue: toGmxUsd(status.netValue),
    leverage: status.leverage === undefined ? undefined : toGmxLeverage(status.leverage),
    pendingBorrowingFee: toGmxUsd(borrowingFee),
    pendingFundingFee: toGmxUsd(fundingFee),
    closeOrderFee: toGmxUsd(status.closeOrderFeeValue),
  };
}
