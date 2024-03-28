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
  mode: "percentage" | "size";
  price: OrderEntryField;
  size: OrderEntryField;
  percentage: OrderEntryField | null;
  txnType: OrderTxnType | null;
  order: null | PositionOrderInfo;
};

export type OrderEntriesInfo<T> = {
  entries: T[];
  canAddEntry: boolean;
  allowAddEntry: boolean;
  addEntry: () => void;
  updateEntry: (id: string, field: "price" | "size" | "percentage", value: string) => void;
  deleteEntry: (id: string) => void;
  reset: () => void;
};

export function getDefaultEntryField(
  decimals: number,
  { input, value, error }: Partial<OrderEntryField> = {}
): OrderEntryField {
  let nextInput = "";
  let nextValue: BigNumber | null = null;
  let nextError = error ?? null;

  if (input) {
    nextInput = String(removeTrailingZeros(input));
    if (!error) {
      nextValue = parseValue(input, decimals) ?? null;
    }
  } else if (value) {
    nextInput = String(removeTrailingZeros(formatAmount(value, decimals, decimals)));
    if (!error) {
      nextValue = value;
    }
  }

  return { input: nextInput, value: nextValue, error: nextError };
}

function getDefaultEntry<T extends OrderEntry>(prefix: string, mode: "percentage" | "size", override?: Partial<T>): T {
  return {
    id: uniqueId(prefix),
    mode,
    price: getDefaultEntryField(USD_DECIMALS),
    size: getDefaultEntryField(USD_DECIMALS),
    percentage: mode === "percentage" ? getDefaultEntryField(PERCENTAGE_DECEMALS, { value: MAX_PERCENTAGE }) : null,
    order: null,
    txnType: null,
    ...override,
  } as T;
}

export default function useOrderEntries<T extends OrderEntry>(
  prefix: string,
  errorHandler: (entry: T) => T,
  {
    initialEntries,
    canAddEntry = true,
    mode = "percentage",
    totalPositionSizeUsd,
  }: {
    initialEntries?: Partial<T>[];
    canAddEntry?: boolean;
    mode?: "percentage" | "size";
    totalPositionSizeUsd?: BigNumber;
  } = {}
): OrderEntriesInfo<T> {
  const initialState = useMemo(() => {
    if (initialEntries?.length)
      return initialEntries.map((entry) => errorHandler(getDefaultEntry<T>(prefix, mode, entry)));
    if (canAddEntry) return [errorHandler(getDefaultEntry<T>(prefix, mode))];
    return [];
  }, [initialEntries, prefix, canAddEntry, mode, errorHandler]);

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
    if (totalPercentage.lte(MAX_PERCENTAGE)) {
      const leftPercentage = MAX_PERCENTAGE.sub(totalPercentage);
      setEntries((prevEntries) => [
        ...prevEntries,
        getDefaultEntry<T>(prefix, mode, {
          percentage: getDefaultEntryField(PERCENTAGE_DECEMALS, {
            value: leftPercentage,
          }),
        } as Partial<T>),
      ]);
    }
  }, [totalPercentage, prefix, mode]);

  const getSizeByPercentage = useCallback(
    (percentage: BigNumber | null) => {
      if (!totalPositionSizeUsd || !percentage) {
        return null;
      }

      return totalPositionSizeUsd.mul(percentage).div(BASIS_POINTS_DIVISOR);
    },
    [totalPositionSizeUsd]
  );

  const getPercentageBySize = useCallback(
    (size: BigNumber | null) => {
      if (!totalPositionSizeUsd?.gt(0) || !size) {
        return null;
      }

      return size.mul(BASIS_POINTS_DIVISOR).div(totalPositionSizeUsd);
    },
    [totalPositionSizeUsd]
  );

  const updateEntry = useCallback(
    (id: string, field: "price" | "size" | "percentage", value: string) => {
      setEntries((prevEntries) => {
        const totalPercentageExcludingCurrent = prevEntries
          .filter((entry) => entry.txnType !== "cancel")
          .reduce(
            (total, entry) => total.add(entry.id !== id && entry.percentage?.value ? entry.percentage.value : 0),
            BigNumber.from(0)
          );

        return prevEntries.map((entry) => {
          if (entry.id !== id) {
            return entry;
          }

          const updatedEntry: T = { ...entry, txnType: entry.order ? "update" : "create" };

          if (field === "size") {
            updatedEntry.size = getDefaultEntryField(USD_DECIMALS, { input: value });
            updatedEntry.percentage = getDefaultEntryField(PERCENTAGE_DECEMALS, {
              value: getPercentageBySize(updatedEntry.size.value),
            });
          } else if (field === "percentage") {
            let nextPercentage = getDefaultEntryField(PERCENTAGE_DECEMALS, { input: value });

            if (totalPercentageExcludingCurrent.add(nextPercentage.value ?? 0).gt(MAX_PERCENTAGE)) {
              nextPercentage = getDefaultEntryField(PERCENTAGE_DECEMALS, {
                value: MAX_PERCENTAGE.sub(totalPercentageExcludingCurrent),
              });
            }

            updatedEntry.percentage = nextPercentage;
            updatedEntry.size = getDefaultEntryField(USD_DECIMALS, {
              value: getSizeByPercentage(updatedEntry.percentage.value),
            });
          } else if (field === "price") {
            updatedEntry.price = getDefaultEntryField(USD_DECIMALS, { input: value });
          }

          if (updatedEntry.txnType === "create" && updatedEntry.price?.value) {
            if (!updatedEntry.size?.value) {
              updatedEntry.size = getDefaultEntryField(USD_DECIMALS, { value: getSizeByPercentage(MAX_PERCENTAGE) });
            }

            if (!updatedEntry.percentage?.value) {
              updatedEntry.size = getDefaultEntryField(PERCENTAGE_DECEMALS, {
                value: MAX_PERCENTAGE.sub(totalPercentageExcludingCurrent),
              });
            }
          }

          return errorHandler(updatedEntry);
        });
      });
    },
    [errorHandler, getSizeByPercentage, getPercentageBySize]
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
              acc.push(getDefaultEntry(prefix, mode));
            }

            return acc;
          }

          acc.push(entry);
          return acc;
        }, []);
      });
    },
    [prefix, mode, canAddEntry]
  );

  const recalculateEntriesPercentage = useCallback(() => {
    setEntries((prevEntries) => {
      return prevEntries.map((entry) => {
        if (!entry.size?.value) return entry;

        return {
          ...entry,
          percentage: getDefaultEntryField(PERCENTAGE_DECEMALS, {
            value: getPercentageBySize(entry.size.value),
          }),
        };
      });
    });
  }, [getPercentageBySize]);

  const prevTotalPositionSizeUsd = usePrevious(totalPositionSizeUsd);
  useEffect(() => {
    if (mode === "percentage" && totalPositionSizeUsd && !totalPositionSizeUsd.eq(prevTotalPositionSizeUsd ?? 0)) {
      recalculateEntriesPercentage();
    }
  }, [recalculateEntriesPercentage, prevTotalPositionSizeUsd, totalPositionSizeUsd, mode]);

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
