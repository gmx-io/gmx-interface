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
  mode: "keepSize" | "keepPercentage" | "fitPercentage";
  order: null | PositionOrderInfo;
};

export type OrderEntriesInfo<T extends OrderEntry> = {
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

function getDefaultEntry<T extends OrderEntry>(prefix: string, override?: Partial<OrderEntry>): T {
  return {
    id: uniqueId(prefix),
    price: getDefaultEntryField(USD_DECIMALS),
    sizeUsd: getDefaultEntryField(USD_DECIMALS),
    percentage: getDefaultEntryField(PERCENTAGE_DECEMALS, { value: MAX_PERCENTAGE }),
    mode: "keepPercentage",
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
  const isPercentage = !!totalPositionSizeUsd;

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
    (entry: T, field: "sizeUsd" | "percentage" | "price", nextField?: Partial<OrderEntryField>) => {
      let { sizeUsd, percentage, price} = entry

      if (field === "sizeUsd") {
        if (nextField) {
          sizeUsd = getDefaultEntryField(USD_DECIMALS, nextField);
        }
        percentage = getDefaultEntryField(PERCENTAGE_DECEMALS, {
          value: getPercentageBySizeUsd(sizeUsd.value),
        });
      } else if (field === "percentage") {
        if (nextField) {
          percentage = getDefaultEntryField(PERCENTAGE_DECEMALS, nextField);
        }
        sizeUsd = getDefaultEntryField(USD_DECIMALS, {
          value: getSizeUsdByPercentage(sizeUsd.value),
        });
      } else if (field === "price") {
        if (nextField) {
          price = getDefaultEntryField(USD_DECIMALS, nextField);
        }
      }

      return { ...entry, sizeUsd, percentage, price } as T;
    },
    [getPercentageBySizeUsd, getSizeUsdByPercentage]
  );

  const initialState = useMemo(() => {
    if (initialEntries?.length) {
      return initialEntries.map((entry) => {
        const initialEntry = getDefaultEntry<T>(prefix, {...entry, mode: "keepSize"});
        const calculatedEntry = recalculateEntryByField(initialEntry, "sizeUsd");
        return errorHandler(calculatedEntry);
      });
    }

    if (canAddEntry) return [errorHandler(getDefaultEntry<T>(prefix, { mode: isPercentage ? "fitPercentage" : "keepSize" }))];

    return [];
  }, [initialEntries, prefix, canAddEntry, isPercentage, errorHandler, recalculateEntryByField]);

  const [entries, setEntries] = useState<T[]>(initialState);

  const totalPercentage = useMemo(() => {
    return entries
      .filter((entry) => entry.txnType !== "cancel")
      .reduce(
        (total, entry) => (entry.percentage?.value ? total.add(entry.percentage.value) : total),
        BigNumber.from(0)
      );
  }, [entries]);

  const clampEntryPercentage = useCallback(
    (entries: T[], entry: T) => {
      const totalPercentageExcludingCurrent = entries
        .filter((ent) => ent.txnType !== "cancel")
        .reduce(
          (total, ent) => total.add(ent.id !== entry.id && ent.percentage?.value ? ent.percentage.value : 0),
          BigNumber.from(0)
        );

      const maxPercentage = MAX_PERCENTAGE.sub(totalPercentageExcludingCurrent);

      let nextEntry = entry;

      if (entry.percentage.value?.gt(maxPercentage) || entry.mode === "fitPercentage") {
        nextEntry = recalculateEntryByField(
          entry,
          "percentage",
          { value: maxPercentage },
        );
      }

      if (nextEntry.percentage.value?.eq(maxPercentage)) {
        nextEntry.mode = "fitPercentage";
      }

      return nextEntry;
    },
    [recalculateEntryByField]
  );

  const addEntry = useCallback(() => {
    const leftPercentage = MAX_PERCENTAGE.sub(totalPercentage);

    if (leftPercentage.gt(0)) {
      setEntries((prevEntries) => [
        ...prevEntries,
        recalculateEntryByField(
          getDefaultEntry<T>(prefix, {
            mode: isPercentage ? "fitPercentage" : "keepSize",
          }), 
          "percentage", 
          { value: leftPercentage }
        ),
      ]);
    }
  }, [totalPercentage, isPercentage, prefix, recalculateEntryByField]);

  const updateEntry = useCallback(
    (id: string, field: "price" | "sizeUsd" | "percentage", value: string) => {
      setEntries((prevEntries) => {
        return prevEntries.map((entry) => {
          if (entry.id !== id) {
            return entry;
          }

          entry.txnType = entry.order ? "update" : "create";

          if (isPercentage) {
            if (entry.mode === "fitPercentage" && field !== "percentage") {
              entry.mode = "fitPercentage";
            } else {
              entry.mode = "keepPercentage";
            }
          }

          const recalculatedEntry = recalculateEntryByField(
            entry,
            field,
            { input: value }
          );

          const clampedEntry = isPercentage ? clampEntryPercentage(prevEntries, recalculatedEntry) : recalculatedEntry;

          return errorHandler(clampedEntry);
        });
      });
    },
    [isPercentage, clampEntryPercentage, recalculateEntryByField, errorHandler]
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
              acc.push(getDefaultEntry(prefix, { mode: isPercentage ? "fitPercentage" : "keepSize" }));
            }

            return acc;
          }

          acc.push(entry);
          return acc;
        }, []);
      });
    },
    [prefix, canAddEntry, isPercentage]
  );

  const prevTotalPositionSizeTokenAmount = usePrevious(totalPositionSizeUsd);
  useEffect(() => {
    if (isPercentage && totalPositionSizeUsd && !totalPositionSizeUsd.eq(prevTotalPositionSizeTokenAmount ?? 0)) {
      setEntries((prevEntries) => {
        const recalculatedEntries = prevEntries.map((entry) => {
          if (entry.txnType === "cancel") return entry;

          if (entry.mode === "keepSize") {
            return recalculateEntryByField(entry, "sizeUsd");
          } else {
            return recalculateEntryByField(entry, "percentage");
          }
        });

        const clampedEntries = recalculatedEntries.map((entry) => {
          if (entry.txnType === "cancel" || entry.mode !== "fitPercentage") return entry;
          return clampEntryPercentage(recalculatedEntries, entry);
        });

        return clampedEntries;
      });
    }
  }, [isPercentage, prevTotalPositionSizeTokenAmount, clampEntryPercentage, totalPositionSizeUsd, recalculateEntryByField]);

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
