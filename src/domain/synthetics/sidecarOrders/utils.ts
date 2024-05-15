import { t } from "@lingui/macro";
import { uniqueId } from "lodash";
import { BigNumber } from "ethers";
import { USD_DECIMALS } from "lib/legacy";
import { PositionOrderInfo } from "domain/synthetics/orders";
import { formatAmount, parseValue, removeTrailingZeros } from "lib/numbers";
import type { InitialEntry, EntryField, SidecarOrderEntry, SidecarOrderEntryBase } from "./types";
import { BASIS_POINTS_DIVISOR } from "config/factors";

export const MAX_PERCENTAGE = BigNumber.from(100);
export const PERCENTAGE_DECEMALS = 0;

export function getDefaultEntryField(
  decimals: number | undefined,
  { input, value, error }: Partial<EntryField> = {}
): EntryField {
  let nextInput = "";
  let nextValue: BigNumber | null = null;
  let nextError = error ?? null;

  const displayPercentage = Math.min(2, decimals ?? 0);

  if (input) {
    nextInput = input;
    nextValue = (decimals !== undefined && parseValue(input, decimals)) || null;
  } else if (value) {
    nextInput =
      decimals !== undefined ? String(removeTrailingZeros(formatAmount(value, decimals, displayPercentage))) : "";
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
    triggerPrice,
    markPrice,
    isLong,
    isLimit,
    isExistingLimits,
    isExistingPosition,
    maxLimitTrigerPrice,
    minLimitTrigerPrice,
    maxLeverage,
  }: {
    liqPrice?: BigNumber;
    triggerPrice?: BigNumber;
    markPrice?: BigNumber;
    isLong?: boolean;
    isLimit?: boolean;
    isExistingLimits?: boolean;
    isExistingPosition?: boolean;
    maxLimitTrigerPrice?: BigNumber;
    minLimitTrigerPrice?: BigNumber;
    maxLeverage?: number;
  }
): T {
  let sizeError: string | null = null;
  let priceError: string | null = null;
  let percentageError: string | null = null;

  const inputPrice = entry.price.value;

  if (inputPrice?.gt(0)) {
    if (markPrice) {
      if (type === "limit") {
        const nextError = isLong
          ? inputPrice.gt(markPrice) && t`Price above Mark Price.`
          : inputPrice.lt(markPrice) && t`Price below Mark Price.`;

        priceError = nextError || priceError;
      }
    }

    if (!isExistingLimits && liqPrice) {
      if (type === "sl") {
        const nextError = isLong
          ? inputPrice.lt(liqPrice) && t`Price below Liq. Price.`
          : inputPrice.gt(liqPrice) && t`Price above Liq. Price.`;

        priceError = nextError || priceError;
      }
    }

    if (isExistingPosition || !isLimit) {
      if (markPrice) {
        if (type === "tp") {
          const nextError = isLong
            ? inputPrice.lt(markPrice) && t`Price below Mark Price.`
            : inputPrice.gt(markPrice) && t`Price above Mark Price.`;

          priceError = nextError || priceError;
        }

        if (type === "sl") {
          const nextError = isLong
            ? inputPrice.gt(markPrice) && t`Price above Mark Price.`
            : inputPrice.lt(markPrice) && t`Price below Mark Price.`;

          priceError = nextError || priceError;
        }
      }
    } else {
      if (isExistingLimits) {
        if (maxLimitTrigerPrice && minLimitTrigerPrice) {
          if (type === "tp") {
            const nextError = isLong
              ? inputPrice.lt(maxLimitTrigerPrice) && t`Price below highest Limit Price.`
              : inputPrice.gt(minLimitTrigerPrice) && t`Price above lowest Limit Price.`;

            priceError = nextError || priceError;
          }

          if (type === "sl") {
            const nextError = isLong
              ? inputPrice.gt(maxLimitTrigerPrice) && t`Price above highest Limit Price.`
              : inputPrice.lt(minLimitTrigerPrice) && t`Price below lowest Limit Price.`;

            priceError = nextError || priceError;
          }
        }
      } else {
        if (triggerPrice) {
          if (type === "tp") {
            const nextError = isLong
              ? inputPrice.lt(triggerPrice) && t`Price below Limit Price.`
              : inputPrice.gt(triggerPrice) && t`Price above Limit Price.`;

            priceError = nextError || priceError;
          }

          if (type === "sl") {
            const nextError = isLong
              ? inputPrice.gt(triggerPrice) && t`Price above Limit Price.`
              : inputPrice.lt(triggerPrice) && t`Price below Limit Price.`;

            priceError = nextError || priceError;
          }
        }
      }
    }
  }

  if (type === "limit") {
    if (!entry.sizeUsd?.value || entry.sizeUsd.value?.eq(0)) {
      sizeError = t`Limit size is required.`;
    }

    if (
      entry?.increaseAmounts?.estimatedLeverage !== undefined &&
      typeof maxLeverage === "number" &&
      entry?.increaseAmounts?.estimatedLeverage?.gt(maxLeverage)
    ) {
      sizeError = t`Max leverage: ${(maxLeverage / BASIS_POINTS_DIVISOR).toFixed(1)}x`;
    }
  } else {
    if (!entry.percentage?.value || entry.percentage.value?.eq(0)) {
      percentageError = t`A Size percentage is required.`;
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
