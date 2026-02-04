import { t } from "@lingui/macro";
import uniqueId from "lodash/uniqueId";

import { USD_DECIMALS } from "config/factors";
import { PositionOrderInfo } from "domain/synthetics/orders";
import { calculateDisplayDecimals, formatAmount, parseValue, removeTrailingZeros } from "lib/numbers";

import type { InitialEntry, EntryField, SidecarOrderEntry, SidecarOrderEntryBase } from "./types";

export const MAX_PERCENTAGE = 100n;
export const PERCENTAGE_DECIMALS = 0;

export function getDefaultEntryField(
  decimals: number | undefined,
  { input, value, error }: Partial<EntryField> = {},
  visualMultiplier?: number
): EntryField {
  let nextInput = "";
  let nextValue: bigint | null = null;
  let nextError = error ?? null;

  if (input) {
    nextInput = input;
    nextValue = (decimals !== undefined && parseValue(input, decimals)) || null;
    if (nextValue !== null && visualMultiplier !== undefined) {
      nextValue = nextValue / BigInt(visualMultiplier);
    }
  } else if (value) {
    nextInput = "";
    if (decimals !== undefined) {
      nextInput = String(
        removeTrailingZeros(
          formatAmount(
            value,
            decimals,
            calculateDisplayDecimals(value, decimals, visualMultiplier),
            undefined,
            undefined,
            visualMultiplier
          )
        )
      );
    }
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
    percentage: getDefaultEntryField(PERCENTAGE_DECIMALS, { value: MAX_PERCENTAGE }),
    mode: "keepPercentage",
    order: null,
    txnType: null,
    ...override,
  } as T;
}

export function prepareInitialEntries({
  positionOrders,
  sort = "desc",
  visualMultiplier,
}: {
  positionOrders: PositionOrderInfo[] | undefined;
  sort: "desc" | "asc";
  visualMultiplier?: number;
}): undefined | InitialEntry[] {
  if (!positionOrders) return;

  return positionOrders
    .sort((a, b) => {
      const [first, second] = sort === "desc" ? [a, b] : [b, a];
      const diff = first.triggerPrice - second.triggerPrice;
      if (diff > 0) return -1;
      if (diff < 0) return 1;
      return 0;
    })
    .map((order) => {
      const entry: InitialEntry = {
        sizeUsd: getDefaultEntryField(USD_DECIMALS, { value: order.sizeDeltaUsd }),
        price: getDefaultEntryField(USD_DECIMALS, { value: order.triggerPrice }, visualMultiplier),
        order,
      };

      return entry;
    });
}

export function handleEntryError<T extends SidecarOrderEntry>(
  entry: T,
  type: "sl" | "tp",
  {
    triggerPrice,
    markPrice,
    isLong,
    isLimit,
    isExistingPosition,
  }: {
    liqPrice?: bigint;
    triggerPrice?: bigint;
    markPrice?: bigint;
    isLong?: boolean;
    isLimit?: boolean;
    isExistingPosition?: boolean;
  }
): T {
  let sizeError: string | null = null;
  let priceError: string | null = null;
  let percentageError: string | null = null;

  const inputPrice = entry.price.value;

  if (inputPrice !== undefined && inputPrice !== null && inputPrice > 0) {
    if (isExistingPosition || !isLimit) {
      if (markPrice !== undefined && markPrice !== null) {
        if (type === "tp") {
          const nextError = isLong
            ? inputPrice < markPrice && t`TP price below mark price`
            : inputPrice > markPrice && t`TP price above mark price`;

          priceError = nextError || priceError;
        }

        if (type === "sl") {
          const nextError = isLong
            ? inputPrice > markPrice && t`SL price above mark price`
            : inputPrice < markPrice && t`SL price below mark price`;

          priceError = nextError || priceError;
        }
      }
    } else {
      if (triggerPrice !== undefined && triggerPrice !== null) {
        if (type === "tp") {
          const nextError = isLong
            ? inputPrice < triggerPrice && t`TP price below limit price`
            : inputPrice > triggerPrice && t`TP price above limit price`;

          priceError = nextError || priceError;
        }

        if (type === "sl") {
          const nextError = isLong
            ? inputPrice > triggerPrice && t`SL price above limit price`
            : inputPrice < triggerPrice && t`SL price below limit price`;

          priceError = nextError || priceError;
        }
      }
    }
  }

  if (entry.percentage?.value === undefined || entry.percentage?.value === 0n) {
    percentageError = t`A size percentage is required`;
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
    (total, entry) => (entry.percentage?.value ? total + entry.percentage.value : total),
    0n
  );

  return totalPercentage > MAX_PERCENTAGE
    ? {
        percentage: "Max percentage exceeded",
      }
    : null;
}
