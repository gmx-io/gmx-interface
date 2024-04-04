import { uniqueId } from "lodash";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BigNumber } from "ethers";
import { PositionOrderInfo, OrderTxnType } from "domain/synthetics/orders";
import { BASIS_POINTS_DIVISOR } from "config/factors";
import { formatAmount, parseValue, removeTrailingZeros, expandDecimals } from "lib/numbers";
import { USD_DECIMALS } from "lib/legacy";
import { usePrevious } from "lib/usePrevious";

export const MAX_PERCENTAGE = BigNumber.from(BASIS_POINTS_DIVISOR); // 100%
const PERCENTAGE_DECEMALS = 2;

export type OrderEntryField = {
  input: string;
  value: BigNumber | null;
  error: string | null;
};

export type OrderEntry = {
  id: string;
  price: OrderEntryField;
  size: OrderEntryField;
  sizeUsd: OrderEntryField;
  percentage: OrderEntryField;
  txnType: OrderTxnType | null;
  order: null | PositionOrderInfo;
};

export type OrderEntriesInfo<T> = {
  entries: T[];
  canAddEntry: boolean;
  allowAddEntry: boolean;
  addEntry: () => void;
  updateEntry: (id: string, field: "price" | "size" | "sizeUsd" | "percentage", value: string) => void;
  deleteEntry: (id: string) => void;
  reset: () => void;
};

export function getDefaultEntryField(
  decimals: number | undefined,
  { input, value, error }: Partial<OrderEntryField> = {}
): OrderEntryField {
  let nextInput = "";
  let nextValue: BigNumber | null = null;
  let nextError = error ?? null;

  if (input) {
    nextInput = String(removeTrailingZeros(input));
    if (!error) {
      nextValue = (decimals && parseValue(input, decimals)) || null;
    }
  } else if (value) {
    nextInput = decimals ? String(removeTrailingZeros(formatAmount(value, decimals, decimals))) : "";
    if (!error) {
      nextValue = value;
    }
  }

  return { input: nextInput, value: nextValue, error: nextError };
}

function getDefaultEntry<T extends OrderEntry>(prefix: string, sizeDecimals?: number, override?: Partial<T>): T {
  return {
    id: uniqueId(prefix),
    price: getDefaultEntryField(sizeDecimals),
    size: getDefaultEntryField(sizeDecimals),
    sizeUsd: getDefaultEntryField(USD_DECIMALS),
    percentage: getDefaultEntryField(PERCENTAGE_DECEMALS, { value: MAX_PERCENTAGE }),
    order: null,
    txnType: null,
    ...override,
  } as T;
}

type InitialEntry<T> = Partial<T> & { price: OrderEntryField; sizeUsd: OrderEntryField };

export default function useOrderEntries<T extends OrderEntry>(
  prefix: string,
  sizeDecimals: number | undefined,
  errorHandler: (entry: T) => T,
  {
    initialEntries,
    canAddEntry = true,
    totalPositionSizeTokenAmount,
  }: {
    initialEntries?: InitialEntry<T>[];
    canAddEntry?: boolean;
    totalPositionSizeTokenAmount?: BigNumber;
  } = {}
): OrderEntriesInfo<T> {
  const getSizeByPercentage = useCallback(
    (percentage: BigNumber | null) => {
      if (!totalPositionSizeTokenAmount || !percentage) {
        return null;
      }

      return totalPositionSizeTokenAmount.mul(percentage).div(BASIS_POINTS_DIVISOR);
    },
    [totalPositionSizeTokenAmount]
  );

  const getPercentageBySize = useCallback(
    (size: BigNumber | null) => {
      if (!totalPositionSizeTokenAmount?.gt(0) || !size) {
        return null;
      }

      return size.mul(BASIS_POINTS_DIVISOR).div(totalPositionSizeTokenAmount);
    },
    [totalPositionSizeTokenAmount]
  );

  const getSizeUsdBySizeAndPrice = useCallback((size: BigNumber | null, price: BigNumber | null) => {
    if (!size || !price) {
      return null;
    }

    return size.mul(price).div(BASIS_POINTS_DIVISOR);
  }, []);

  const getSizeBySizeUsdAndPrice = useCallback(
    (sizeUsd: BigNumber | null, price: BigNumber | null) => {
      if (!sizeUsd || !price || !sizeDecimals) {
        return null;
      }

      return sizeUsd.mul(expandDecimals(1, sizeDecimals)).div(price);
    },
    [sizeDecimals]
  );

  const recalculateEntryByField = useCallback(
    (
      entry: T,
      sizeDecimals: number | undefined,
      field: "size" | "sizeUsd" | "percentage" | "price",
      fieldUpdate?: Partial<OrderEntryField>
    ) => {
      let { size, sizeUsd, percentage, price } = entry;

      if (field === "size") {
        if (fieldUpdate) {
          size = getDefaultEntryField(sizeDecimals, fieldUpdate);
        }
        percentage = getDefaultEntryField(PERCENTAGE_DECEMALS, {
          value: getPercentageBySize(size.value),
        });
        sizeUsd = getDefaultEntryField(USD_DECIMALS, {
          value: getSizeUsdBySizeAndPrice(size.value, price?.value),
        });
      } else if (field === "sizeUsd") {
        if (fieldUpdate) {
          sizeUsd = getDefaultEntryField(USD_DECIMALS, fieldUpdate);
        }
        size = getDefaultEntryField(sizeDecimals, {
          value: getSizeBySizeUsdAndPrice(sizeUsd.value, price?.value),
        });
        percentage = getDefaultEntryField(PERCENTAGE_DECEMALS, {
          value: getPercentageBySize(size.value),
        });
      } else if (field === "percentage") {
        if (fieldUpdate) {
          percentage = getDefaultEntryField(PERCENTAGE_DECEMALS, fieldUpdate);
        }
        size = getDefaultEntryField(sizeDecimals, {
          value: getSizeByPercentage(percentage.value),
        });
        sizeUsd = getDefaultEntryField(USD_DECIMALS, {
          value: getSizeUsdBySizeAndPrice(size.value, price?.value),
        });
      } else if (field === "price") {
        if (fieldUpdate) {
          price = getDefaultEntryField(USD_DECIMALS, fieldUpdate);
        }
        size = getDefaultEntryField(sizeDecimals, {
          value: getSizeByPercentage(percentage.value),
        });
        percentage = getDefaultEntryField(PERCENTAGE_DECEMALS, {
          value: getPercentageBySize(size.value),
        });
      }

      return { ...entry, size, sizeUsd, percentage, price } as T;
    },
    [getPercentageBySize, getSizeByPercentage, getSizeBySizeUsdAndPrice, getSizeUsdBySizeAndPrice]
  );

  const clampEntryPercentage = useCallback(
    (entry: T, maxPercentage: BigNumber) => {
      if (entry.percentage.value?.gt(maxPercentage)) {
        return recalculateEntryByField(entry, sizeDecimals, "percentage", {
          value: maxPercentage,
        });
      }

      return entry;
    },
    [recalculateEntryByField, sizeDecimals]
  );

  const initialState = useMemo(() => {
    if (initialEntries?.length) {
      return initialEntries.map((entry) => {
        const initialEntry = recalculateEntryByField(
          getDefaultEntry<T>(prefix, sizeDecimals, entry),
          USD_DECIMALS,
          "sizeUsd"
        );
        return errorHandler(initialEntry);
      });
    }

    if (canAddEntry) return [errorHandler(getDefaultEntry<T>(prefix, sizeDecimals))];

    return [];
  }, [initialEntries, prefix, canAddEntry, sizeDecimals, errorHandler, recalculateEntryByField]);

  const [entries, setEntries] = useState<T[]>(initialState);

  const totalPercentage = useMemo(() => {
    return entries
      .filter((entry) => entry.txnType !== "cancel")
      .reduce(
        (total, entry) => (entry.percentage?.value ? total.add(entry.percentage.value) : total),
        BigNumber.from(0)
      );
  }, [entries]);

  const addEntry = useCallback(() => {
    const leftPercentage = MAX_PERCENTAGE.sub(totalPercentage);

    if (leftPercentage.gt(0)) {
      setEntries((prevEntries) => [
        ...prevEntries,
        recalculateEntryByField(getDefaultEntry<T>(prefix, sizeDecimals), sizeDecimals, "percentage", {
          value: leftPercentage,
        }),
      ]);
    }
  }, [totalPercentage, prefix, sizeDecimals, recalculateEntryByField]);

  const updateEntry = useCallback(
    (id: string, field: "price" | "size" | "sizeUsd" | "percentage", value: string) => {
      setEntries((prevEntries) => {
        const totalPercentageExcludingCurrent = prevEntries
          .filter((entry) => entry.txnType !== "cancel")
          .reduce(
            (total, entry) => total.add(entry.id !== id && entry.percentage?.value ? entry.percentage.value : 0),
            BigNumber.from(0)
          );

        const maxPercentage = MAX_PERCENTAGE.sub(totalPercentageExcludingCurrent);

        return prevEntries.map((entry) => {
          if (entry.id !== id) {
            return entry;
          }

          const recalculatedEntry = recalculateEntryByField(
            { ...entry, txnType: entry.order ? "update" : "create" },
            sizeDecimals,
            field,
            { input: value }
          );

          const updatedEntry = clampEntryPercentage(recalculatedEntry, maxPercentage);

          return errorHandler(updatedEntry);
        });
      });
    },
    [clampEntryPercentage, recalculateEntryByField, errorHandler, sizeDecimals]
  );

  const reset = useCallback(() => setEntries(initialState), [initialState]);

  const deleteEntry = useCallback(
    (id: string) => {
      setEntries((prevEntries) => {
        const isLastEntry = prevEntries.filter((entry) => entry.txnType !== "cancel").length <= 1;

        return prevEntries.reduce<T[]>((acc, entry) => {
          if (entry.id === id) {
            if (entry.order) {
              acc.push({
                ...entry,
                txnType: "cancel",
              });
            }

            if (isLastEntry && canAddEntry) {
              acc.push(getDefaultEntry(prefix, sizeDecimals));
            }

            return acc;
          }

          acc.push(entry);
          return acc;
        }, []);
      });
    },
    [prefix, canAddEntry, sizeDecimals]
  );

  const prevTotalPositionSizeTokenAmount = usePrevious(totalPositionSizeTokenAmount);
  useEffect(() => {
    if (totalPositionSizeTokenAmount && !totalPositionSizeTokenAmount.eq(prevTotalPositionSizeTokenAmount ?? 0)) {
      setEntries((prevEntries) => {
        return prevEntries.map((entry) => {
          if (!entry.txnType && !entry.order) return entry;

          return recalculateEntryByField(entry, sizeDecimals, "size");
        });
      });
    }
  }, [prevTotalPositionSizeTokenAmount, totalPositionSizeTokenAmount, sizeDecimals, recalculateEntryByField]);

  return {
    entries,
    addEntry,
    updateEntry,
    deleteEntry,
    reset,
    canAddEntry,
    allowAddEntry: canAddEntry && totalPercentage.lte(MAX_PERCENTAGE),
  };
}
