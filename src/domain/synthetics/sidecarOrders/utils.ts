import { t } from "@lingui/macro";
import { uniqueId } from "lodash";
import { BigNumber } from "ethers";
import { USD_DECIMALS } from "lib/legacy";
import { PositionOrderInfo } from "domain/synthetics/orders";
import { formatAmount, parseValue, removeTrailingZeros } from "lib/numbers";
import type { InitialEntry, EntryField, SidecarOrderEntry, SidecarOrderEntryBase } from "./types";
import { BASIS_POINTS_DIVISOR, MAX_ALLOWED_LEVERAGE } from "config/factors";

export const MAX_PERCENTAGE = BigNumber.from(100);
export const PERCENTAGE_DECEMALS = 0;

export function getDefaultEntryField(
  decimals: number | undefined,
  { input, value, error }: Partial<EntryField> = {}
): EntryField {
  let nextInput = "";
  let nextValue: BigNumber | null = null;
  let nextError = error ?? null;

  if (input) {
    nextInput = input;
    nextValue = (decimals !== undefined && parseValue(input, decimals)) || null;
  } else if (value) {
    nextInput = decimals !== undefined ? String(removeTrailingZeros(formatAmount(value, decimals, decimals))) : "";
    nextValue = value;
  }

  return { input: nextInput, value: nextValue, error: nextError };
}

export function getDefaultEntry<T extends SidecarOrderEntryBase>(
  prefix: string,
  override?: Partial<SidecarOrderEntryBase>
): T {
  return {
    id: uniqueId(`${prefix}_`),
    price: getDefaultEntryField(USD_DECIMALS),
    sizeUsd: getDefaultEntryField(USD_DECIMALS),
    percentage: getDefaultEntryField(PERCENTAGE_DECEMALS, { value: MAX_PERCENTAGE }),
    mode: "keepPercentage",
    order: null,
    txnType: null,
    ...override,
  } as T;
}

export function prepareInitialEntries({
  positionOrders,
  sort = "desc",
}: {
  positionOrders: PositionOrderInfo[] | undefined;
  sort: "desc" | "asc";
}): undefined | InitialEntry[] {
  if (!positionOrders) return;

  return positionOrders
    .sort((a, b) => {
      const [first, second] = sort === "desc" ? [a, b] : [b, a];
      const diff = first.triggerPrice.sub(second.triggerPrice);
      if (diff.gt(0)) return -1;
      if (diff.lt(0)) return 1;
      return 0;
    })
    .map((order) => {
      const entry: InitialEntry = {
        sizeUsd: getDefaultEntryField(USD_DECIMALS, { value: order.sizeDeltaUsd }),
        price: getDefaultEntryField(USD_DECIMALS, { value: order.triggerPrice }),
        order,
      };

      return entry;
    });
}

export function handleEntryError<T extends SidecarOrderEntry>(
  entry: T,
  type: "sl" | "tp" | "limit",
  {
    liqPrice,
    entryPrice,
    isLong,
    isLimit,
    isAnyLimits,
    isExistingPosition,
    maxLimitTrigerPrice,
    minLimitTrigerPrice,
  }: {
    liqPrice?: BigNumber;
    entryPrice?: BigNumber;
    isLong?: boolean;
    isLimit?: boolean;
    isAnyLimits?: boolean;
    isExistingPosition?: boolean;
    maxLimitTrigerPrice?: BigNumber;
    minLimitTrigerPrice?: BigNumber;
  }
): T {
  let sizeError: string | null = null;
  let priceError: string | null = null;
  let percentageError: string | null = null;

  if (liqPrice && entryPrice && entry.price?.value?.gt(0)) {
    const inputPrice = entry.price.value;

    const isExistingOrder = !!entry.order;
    const isPriceAboveMark = inputPrice?.gte(entryPrice);
    const isPriceBelowMark = inputPrice?.lte(entryPrice);
    const priceLiqError = isLong ? t`Price below Liq. Price.` : t`Price above Liq. Price.`;
    const priceAboveMsg = isLimit ? t`Price above Limit Price.` : t`Price above Mark Price.`;
    const priceBelowMsg = isLimit ? t`Price below Limit Price.` : t`Price below Mark Price.`;

    if (type === "sl") {
      if (!isLimit || isExistingPosition) {
        if (isPriceAboveMark && !isExistingOrder && isLong) {
          priceError = priceAboveMsg;
        }

        if (isPriceBelowMark && !isExistingOrder && !isLong) {
          priceError = priceBelowMsg;
        }

        if (!isAnyLimits) {
          if (inputPrice?.lte(liqPrice) && isLong) {
            priceError = priceLiqError;
          }
          if (inputPrice?.gte(liqPrice) && !isLong) {
            priceError = priceLiqError;
          }
        }
      } else {
        if (isAnyLimits) {
          if (maxLimitTrigerPrice && inputPrice?.gte(maxLimitTrigerPrice) && isLong) {
            priceError = priceAboveMsg;
          }

          if (minLimitTrigerPrice && inputPrice?.lte(minLimitTrigerPrice) && !isLong) {
            priceError = priceBelowMsg;
          }
        }
      }
    }

    if (type === "tp") {
      if (!isLimit || isExistingPosition) {
        if (isPriceBelowMark && isLong) {
          priceError = priceBelowMsg;
        }

        if (isPriceAboveMark && !isLong) {
          priceError = priceAboveMsg;
        }
      } else {
        if (isAnyLimits) {
          if (maxLimitTrigerPrice && inputPrice?.lte(maxLimitTrigerPrice) && isLong) {
            priceError = priceBelowMsg;
          }

          if (minLimitTrigerPrice && inputPrice?.gte(minLimitTrigerPrice) && !isLong) {
            priceError = priceAboveMsg;
          }
        }
      }
    }

    if (type === "limit") {
      if (!isLimit || isExistingPosition) {
        if (isPriceAboveMark && isLong) {
          priceError = priceAboveMsg;
        }

        if (isPriceBelowMark && !isLong) {
          priceError = priceBelowMsg;
        }
      }

      if (!entry.sizeUsd?.value || entry.sizeUsd.value?.eq(0)) {
        sizeError = t`Limit size is required.`;
      }

      if (entry?.increaseAmounts?.estimatedLeverage?.gt(MAX_ALLOWED_LEVERAGE)) {
        sizeError = t`Max leverage: ${(MAX_ALLOWED_LEVERAGE / BASIS_POINTS_DIVISOR).toFixed(1)}x`;
      }
    }

    if (type !== "limit") {
      if (!entry.percentage?.value || entry.percentage.value?.eq(0)) {
        percentageError = t`A Size percentage is required.`;
      }
    }
  }

  return {
    ...entry,
    sizeUsd: { ...entry.sizeUsd, error: sizeError },
    price: { ...entry.price, error: priceError },
    percentage: { ...entry.percentage, error: percentageError },
  };
}

export function getCommonError(displayableEntries: SidecarOrderEntry[] = []) {
  const totalPercentage = displayableEntries.reduce(
    (total, entry) => (entry.percentage?.value ? total.add(entry.percentage.value) : total),
    BigNumber.from(0)
  );

  return totalPercentage.gt(MAX_PERCENTAGE)
    ? {
        percentage: "Max percentage exceeded",
      }
    : null;
}
