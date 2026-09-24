import type {
  BuybackPoolStatus,
  GtBuybackParticipation,
  GtBuybackSummary,
  MyBuybackParticipationView,
  TodaysBuybackPoolView,
} from '../types';
import { USDC_DECIMALS } from '../buybackConstants';

export function parseNum(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function rawToUi(raw: string | number | undefined | null, decimals: number): number {
  const n = parseNum(raw);
  if (n === 0) return 0;
  return n / 10 ** decimals;
}

export function uiToRawAmountString(uiAmount: number, decimals: number): string {
  if (!Number.isFinite(uiAmount) || uiAmount <= 0) return '0';
  return String(Math.floor(uiAmount * 10 ** decimals + 1e-9));
}

/**
 * Price = payout token raw amount per raw GT.
 * Returns USDC-per-GT in UI units.
 */
export function priceToUi(
  price: string | number | null | undefined,
  gtDecimals: number
): number {
  const n = parseNum(price);
  if (n === 0) return 0;
  return n * 10 ** (gtDecimals - USDC_DECIMALS);
}

/**
 * Price = USDC-per-GT in UI units.
 * Returns GT-per-USDC in UI units.
 */

export function priceToMintBuybackPriceUi(
  price: string | number | null | undefined,
): number {
  const n = parseNum(price);
  if (n === 0) return 0;
  return n / 10 ** (USDC_DECIMALS);
}

export function usdcRawToUi(raw: string | number | undefined | null): number {
  return rawToUi(raw, USDC_DECIMALS);
}

export function calcAvailableToSell(
  userRemainingGtUi: number,
  gtBalanceUi: number
): number {
  return Math.max(0, Math.min(userRemainingGtUi, gtBalanceUi));
}

/**
 * Est. Sell Proceeds after adding `inputGt` into the current sell queue.
 * Uses UI units (GT amount, USDC amount, USDC-per-GT price).
 */
export function calcEstimatedSellProceeds(
  inputGt: number,
  maxBuybackValue: number,
  queuedGtForSell: number,
  estBuybackPrice: number,
  currentMintingPrice: number
): number {
  if (!Number.isFinite(inputGt) || inputGt <= 0) return 0;
  const newQueuedGt = inputGt + queuedGtForSell;
  if (newQueuedGt <= 0) return 0;
  if (maxBuybackValue / newQueuedGt < currentMintingPrice) {
    return maxBuybackValue * (inputGt / newQueuedGt);
  }
  return inputGt * estBuybackPrice;
}

/**
 * Pool pressure from est buyback price vs current minting price.
 * Strong >= 80%, Moderate >= 50%, else Under Pressure.
 */
export function calcBuybackPoolStatus(
  estBuybackPriceUi: number,
  currentMintingPriceUi: number
): { status: BuybackPoolStatus; ratioPercent: number } {
  if (currentMintingPriceUi <= 0) {
    return { status: 'Under Pressure', ratioPercent: 0 };
  }
  const ratio = estBuybackPriceUi / currentMintingPriceUi;
  const ratioPercent = Math.floor(ratio * 10000 + 1e-9) / 100;
  if (ratio >= 0.8) {
    return { status: 'Strong', ratioPercent };
  }
  if (ratio >= 0.5) {
    return { status: 'Moderate', ratioPercent };
  }
  return { status: 'Under Pressure', ratioPercent };
}

export function deriveTodaysBuybackPool(
  summary: GtBuybackSummary,
  gtDecimals: number
): TodaysBuybackPoolView {


  return {
    maxBuybackValue: usdcRawToUi(summary.maxBuybackValueUsdcAmount),
    queuedGtForSell: rawToUi(summary.globalQueuedGt, gtDecimals),
    estBuybackPrice: priceToMintBuybackPriceUi(summary.estimatedBuybackPrice),
    currentMintingPrice: priceToMintBuybackPriceUi(summary.currentMintingPrice),
    nextBuybackTimestamp: summary.nextBuybackTimestamp,
  };
}

export function deriveMyBuybackParticipation(
  participation: GtBuybackParticipation,
  gtDecimals: number
): MyBuybackParticipationView {
  return {
    queuedGtForSell: rawToUi(participation.userParticipatingGt, gtDecimals),
    estSellProceeds: usdcRawToUi(
      participation.userEstimatedSellProceedsUsdcAmount
    ),
    finalPayoutUsdc: usdcRawToUi(participation.finalPayoutUsdcAmount),
  };
}

export function formatCountdownToTimestamp(
  timestampSec: string | number,
  now = new Date()
): string {
  const endSec = parseNum(timestampSec);
  if (endSec <= 0) return '—';
  const diffMs = Math.max(0, endSec * 1000 - now.getTime());
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${pad(hours)} h ${pad(minutes)} m`;
}

/** Truncate decimals (no round). e.g. 1.239, digits=2 -> 1.23 */
function truncateDecimals(value: number, digits: number): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.floor(value * factor) / factor;
}

export function formatGtAmount(value: number, digits = 2): string {
  return truncateDecimals(value, digits).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatEstBuybackPrice(value: number, digits = 4): string {
  return truncateDecimals(value, digits).toLocaleString('en-US', {
    minimumFractionDigits: Math.min(digits, 2),
    maximumFractionDigits: digits,
  });
}

export function formatUsdcAmount(value: number, digits = 4): string {
  if (value > 0 && value < 0.01 && digits >= 2) {
    return '<0.01';
  }
  return truncateDecimals(value, digits).toLocaleString('en-US', {
    minimumFractionDigits: Math.min(digits, 2),
    maximumFractionDigits: digits,
  });
}

export function formatSellGtInputAmount(value: number): string {
  if (value <= 0) return '';
  const digits = value >= 1 ? 4 : 6;
  const truncated = truncateDecimals(value, digits);
  return truncated > 0 ? String(truncated) : '';
}
