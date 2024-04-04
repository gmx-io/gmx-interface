import { uniqueId } from "lodash";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BigNumber } from "ethers";
import { PositionOrderInfo, OrderTxnType } from "domain/synthetics/orders";
import { BASIS_POINTS_DIVISOR } from "config/factors";
import { formatAmount, parseValue, removeTrailingZeros } from "lib/numbers";
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
  updateEntry: (id: string, field: "price" | "sizeUsd" | "percentage", value: string) => void;
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

function getDefaultEntry<T extends OrderEntry>(prefix: string, override?: Partial<T>): T {
  return {
    id: uniqueId(prefix),
    price: getDefaultEntryField(USD_DECIMALS),
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
  errorHandler: (entry: T) => T,
  {
    initialEntries,
    canAddEntry = true,
    totalPositionSizeUsd,
  }: {
    initialEntries?: InitialEntry<T>[];
    canAddEntry?: boolean;
    totalPositionSizeUsd?: BigNumber;
  } = {}
): OrderEntriesInfo<T> {
  const getPercentageBySizeUsd = useCallback(
    (sizeUsd: BigNumber | null) => {
      if (!sizeUsd || !totalPositionSizeUsd?.gt(0)) {
        return null;
      }

      return sizeUsd.mul(MAX_PERCENTAGE).div(totalPositionSizeUsd);
    },
    [totalPositionSizeUsd]
  );

  const getSizeUsdByPercentage = useCallback(
    (percentage: BigNumber | null) => {
      if (!percentage || !totalPositionSizeUsd?.gt(0)) {
        return null;
      }

      return totalPositionSizeUsd.mul(percentage).div(MAX_PERCENTAGE);
    },
    [totalPositionSizeUsd]
  );

  const recalculateEntryByField = useCallback(
    (entry: T, field: "sizeUsd" | "percentage" | "price", fieldUpdate?: Partial<OrderEntryField>) => {
      let { sizeUsd, percentage, price } = entry;

      if (field === "sizeUsd") {
        if (fieldUpdate) {
          sizeUsd = getDefaultEntryField(USD_DECIMALS, fieldUpdate);
        }
        percentage = getDefaultEntryField(PERCENTAGE_DECEMALS, {
          value: getPercentageBySizeUsd(sizeUsd.value),
        });
      } else if (field === "percentage") {
        if (fieldUpdate) {
          percentage = getDefaultEntryField(PERCENTAGE_DECEMALS, fieldUpdate);
        }
        sizeUsd = getDefaultEntryField(USD_DECIMALS, {
          value: getSizeUsdByPercentage(sizeUsd.value),
        });
      } else if (field === "price") {
        if (fieldUpdate) {
          price = getDefaultEntryField(USD_DECIMALS, fieldUpdate);
        }
      }

      return { ...entry, sizeUsd, percentage, price } as T;
    },
    [getPercentageBySizeUsd, getSizeUsdByPercentage]
  );

  const clampEntryPercentage = useCallback(
    (entry: T, maxPercentage: BigNumber) => {
      if (entry.percentage.value?.gt(maxPercentage)) {
        return recalculateEntryByField(entry, "percentage", {
          value: maxPercentage,
        });
      }

      return entry;
    },
    [recalculateEntryByField]
  );

  const initialState = useMemo(() => {
    if (initialEntries?.length) {
      return initialEntries.map((entry) => {
        const initialEntry = recalculateEntryByField(getDefaultEntry<T>(prefix, entry), "sizeUsd");
        return errorHandler(initialEntry);
      });
    }

    if (canAddEntry) return [errorHandler(getDefaultEntry<T>(prefix))];

    return [];
  }, [initialEntries, prefix, canAddEntry, errorHandler, recalculateEntryByField]);

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
        recalculateEntryByField(getDefaultEntry<T>(prefix), "percentage", {
          value: leftPercentage,
        }),
      ]);
    }
  }, [totalPercentage, prefix, recalculateEntryByField]);

  const updateEntry = useCallback(
    (id: string, field: "price" | "sizeUsd" | "percentage", value: string) => {
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
            field,
            { input: value }
          );

          const updatedEntry = clampEntryPercentage(recalculatedEntry, maxPercentage);

          return errorHandler(updatedEntry);
        });
      });
    },
    [clampEntryPercentage, recalculateEntryByField, errorHandler]
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
              acc.push(getDefaultEntry(prefix));
            }

            return acc;
          }

          acc.push(entry);
          return acc;
        }, []);
      });
    },
    [prefix, canAddEntry]
  );

  const prevTotalPositionSizeTokenAmount = usePrevious(totalPositionSizeUsd);
  useEffect(() => {
    if (totalPositionSizeUsd && !totalPositionSizeUsd.eq(prevTotalPositionSizeTokenAmount ?? 0)) {
      setEntries((prevEntries) => {
        return prevEntries.map((entry) => {
          if (!entry.txnType && !entry.order) return entry;

          return recalculateEntryByField(entry, "sizeUsd");
        });
      });
    }
  }, [prevTotalPositionSizeTokenAmount, totalPositionSizeUsd, recalculateEntryByField]);

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
