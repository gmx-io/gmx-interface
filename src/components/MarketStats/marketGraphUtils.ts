import { formatAmount, numberToBigint, USD_DECIMALS } from "lib/numbers";

const PRICE_GRAPH_Y_AXIS_PADDING_FACTOR = 0.1;
const PRICE_GRAPH_Y_AXIS_FLAT_PADDING_FACTOR = 0.005;
const PRICE_GRAPH_Y_AXIS_TICK_COUNT = 5;
const PRICE_GRAPH_Y_AXIS_MAX_DECIMALS = 8;

export type MarketGraphYAxisDomain = [number, number];

export function getPriceGraphYAxisDomain(data: { value: number }[]): MarketGraphYAxisDomain | undefined {
  const values = data.map((item) => item.value).filter((value) => Number.isFinite(value) && value > 0);

  if (values.length === 0) {
    return undefined;
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  if (minValue === maxValue) {
    const padding = Math.max(Math.abs(minValue) * PRICE_GRAPH_Y_AXIS_FLAT_PADDING_FACTOR, Number.EPSILON);

    return [getPositivePriceLowerBound(minValue - padding, minValue), maxValue + padding];
  }

  const padding = (maxValue - minValue) * PRICE_GRAPH_Y_AXIS_PADDING_FACTOR;

  return [getPositivePriceLowerBound(minValue - padding, minValue), maxValue + padding];
}

function getPositivePriceLowerBound(lowerBound: number, minValue: number) {
  if (lowerBound > 0) {
    return lowerBound;
  }

  return minValue * (1 - PRICE_GRAPH_Y_AXIS_FLAT_PADDING_FACTOR);
}

export function getPriceGraphYAxisTickDecimals(domain: MarketGraphYAxisDomain | undefined): number {
  if (!domain) {
    return 2;
  }

  const [minValue, maxValue] = domain;
  const bucketSize = Math.abs(maxValue - minValue);

  if (!Number.isFinite(bucketSize) || bucketSize === 0) {
    return 2;
  }

  const estimatedTickSize = bucketSize / (PRICE_GRAPH_Y_AXIS_TICK_COUNT - 1);
  const tickSizeDecimals = Math.ceil(-Math.log10(estimatedTickSize));
  const minPositiveValue = Math.min(...domain.filter((value) => value > 0));
  const minValueDecimals = Number.isFinite(minPositiveValue) ? Math.ceil(-Math.log10(minPositiveValue)) : 0;
  const decimals = Math.max(tickSizeDecimals, minValueDecimals, 0);

  return Math.min(decimals, PRICE_GRAPH_Y_AXIS_MAX_DECIMALS);
}

export function formatPriceGraphYAxisTick(value: number, domain: MarketGraphYAxisDomain | undefined): string {
  if (!Number.isFinite(value)) {
    return "";
  }

  const decimals = getPriceGraphYAxisTickDecimals(domain);

  return formatAmount(numberToBigint(value, USD_DECIMALS), USD_DECIMALS, decimals, true);
}
