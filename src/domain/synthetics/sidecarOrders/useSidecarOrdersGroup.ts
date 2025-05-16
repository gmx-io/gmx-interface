import { Dispatch, SetStateAction, useCallback, useEffect, useMemo } from "react";

import { USD_DECIMALS } from "config/factors";
import { selectSelectedMarketVisualMultiplier } from "context/SyntheticsStateContext/selectors/statsSelectors";
import {
  makeSelectTradeboxSidecarOrdersEntriesIsUntouched,
  makeSelectTradeboxSidecarOrdersState,
  makeSelectTradeboxSidecarOrdersTotalPercentage,
  selectTradeboxSidecarEntriesSetIsUntouched,
  selectTradeboxSidecarOrdersTotalSizeUsd,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors/selectTradeboxSidecarOrders";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { usePrevious } from "lib/usePrevious";
import { bigMath } from "sdk/utils/bigmath";

import { EntryField, GroupPrefix, SidecarOrderEntryBase, SidecarOrderEntryGroupBase } from "./types";
import { MAX_PERCENTAGE, PERCENTAGE_DECIMALS, getDefaultEntry, getDefaultEntryField } from "./utils";

export function useSidecarOrdersGroup<T extends SidecarOrderEntryBase>({
  prefix,
  errorHandler,
  initialEntries,
  canAddEntry = true,
  enablePercentage = true,
}: {
  prefix: GroupPrefix;
  errorHandler: (entry: T) => T;
  initialEntries?: (Partial<T> & { price: EntryField; sizeUsd: EntryField })[];
  canAddEntry?: boolean;
  enablePercentage?: boolean;
}): SidecarOrderEntryGroupBase<T> {
  const isUntouched = useSelector(makeSelectTradeboxSidecarOrdersEntriesIsUntouched(prefix));
  const setIsUntouched = useSelector(selectTradeboxSidecarEntriesSetIsUntouched);
  const totalPositionSizeUsd = useSelector(selectTradeboxSidecarOrdersTotalSizeUsd);

  const visualMultiplier = useSelector(selectSelectedMarketVisualMultiplier);

  const getPercentageBySizeUsd = useCallback(
    (sizeUsd: bigint | null) => {
      if (
        sizeUsd === undefined ||
        sizeUsd === null ||
        totalPositionSizeUsd === undefined ||
        totalPositionSizeUsd <= 0
      ) {
        return null;
      }

      return bigMath.mulDiv(sizeUsd, MAX_PERCENTAGE, totalPositionSizeUsd);
    },
    [totalPositionSizeUsd]
  );

  const getSizeUsdByPercentage = useCallback(
    (percentage: bigint | null) => {
      if (
        percentage === undefined ||
        percentage === null ||
        percentage === 0n ||
        totalPositionSizeUsd === undefined ||
        totalPositionSizeUsd <= 0
      ) {
        return null;
      }

      return bigMath.mulDiv(totalPositionSizeUsd, percentage, MAX_PERCENTAGE);
    },
    [totalPositionSizeUsd]
  );

  const recalculateEntryByField = useCallback(
    (entry: SidecarOrderEntryBase, field: "sizeUsd" | "percentage" | "price", nextField?: Partial<EntryField>) => {
      let { sizeUsd, percentage, price } = entry;

      if (field === "sizeUsd") {
        if (nextField) {
          sizeUsd = getDefaultEntryField(USD_DECIMALS, nextField);
        }
        percentage = getDefaultEntryField(PERCENTAGE_DECIMALS, {
          value: getPercentageBySizeUsd(sizeUsd.value),
        });
      } else if (field === "percentage") {
        if (nextField) {
          percentage = getDefaultEntryField(PERCENTAGE_DECIMALS, nextField);
        }
        sizeUsd = getDefaultEntryField(USD_DECIMALS, {
          value: getSizeUsdByPercentage(percentage.value),
        });
      } else if (field === "price") {
        if (nextField) {
          price = getDefaultEntryField(USD_DECIMALS, nextField, visualMultiplier);
        }
      }

      return { ...entry, sizeUsd, percentage, price } as T;
    },
    [getPercentageBySizeUsd, getSizeUsdByPercentage, visualMultiplier]
  );

  const initialState = useMemo(() => {
    if (initialEntries?.length) {
      return initialEntries.map((entry) => {
        const initialEntry = getDefaultEntry(prefix, { ...entry, mode: "keepSize" });
        const calculatedEntry = recalculateEntryByField(initialEntry, "sizeUsd");
        return errorHandler(calculatedEntry);
      });
    }

    if (canAddEntry) {
      return [errorHandler(getDefaultEntry(prefix, { mode: enablePercentage ? "fitPercentage" : "keepSize" }))];
    }

    return [];
  }, [initialEntries, prefix, canAddEntry, enablePercentage, errorHandler, recalculateEntryByField]);

  const ordersState = useSelector(makeSelectTradeboxSidecarOrdersState(prefix));

  const [entries, setEntries] = ordersState as any as [T[], Dispatch<SetStateAction<T[]>>];

  useEffect(() => {
    if (isUntouched) {
      setIsUntouched(prefix, false);
      setEntries(initialState);
    }
  }, [initialState, setEntries, isUntouched, setIsUntouched, prefix]);

  useEffect(() => {
    setEntries((prevEntries) => prevEntries.map((entry) => errorHandler(entry)));
  }, [errorHandler, setEntries]);

  const totalPercentage = useSelector(makeSelectTradeboxSidecarOrdersTotalPercentage(prefix));

  const clampEntryPercentage = useCallback(
    (entries: SidecarOrderEntryBase[], entry: T) => {
      if (entry.mode !== "fitPercentage") return entry;

      const totalPercentageExcludingCurrent = entries
        .filter((ent) => ent.txnType !== "cancel")
        .reduce((total, ent) => total + (ent.id !== entry.id && ent.percentage?.value ? ent.percentage.value : 0n), 0n);

      const remainingPercentage =
        MAX_PERCENTAGE > totalPercentageExcludingCurrent ? MAX_PERCENTAGE - totalPercentageExcludingCurrent : 0n;

      return recalculateEntryByField(entry, "percentage", { value: remainingPercentage });
    },
    [recalculateEntryByField]
  );

  const addEntry = useCallback(() => {
    const leftPercentage = MAX_PERCENTAGE - totalPercentage;

    if (leftPercentage > 0) {
      setIsUntouched(prefix, false);
      setEntries((prevEntries) => [
        ...prevEntries,
        recalculateEntryByField(
          getDefaultEntry<T>(prefix, {
            mode: enablePercentage ? "fitPercentage" : "keepSize",
          }),
          "percentage",
          { value: leftPercentage }
        ),
      ]);
    }
  }, [totalPercentage, enablePercentage, prefix, setEntries, recalculateEntryByField, setIsUntouched]);

  const updateEntry = useCallback(
    (id: string, field: "price" | "sizeUsd" | "percentage", value: string) => {
      setIsUntouched(prefix, false);
      setEntries((prevEntries) => {
        return prevEntries.map((entry) => {
          if (entry.id !== id) {
            return entry;
          }

          entry.txnType = entry.order ? "update" : "create";

          if (enablePercentage) {
            if (entry.mode === "fitPercentage" && field !== "percentage") {
              entry.mode = "fitPercentage";
            } else {
              entry.mode = "keepPercentage";
            }
          }

          const recalculatedEntry = recalculateEntryByField(entry, field, { input: value });

          const clampedEntry = enablePercentage
            ? clampEntryPercentage(prevEntries, recalculatedEntry)
            : recalculatedEntry;

          return errorHandler(clampedEntry as T);
        });
      });
    },
    [enablePercentage, clampEntryPercentage, setEntries, recalculateEntryByField, errorHandler, prefix, setIsUntouched]
  );

  const reset = useCallback(() => {
    setEntries(initialState);
    setIsUntouched(prefix, true);
  }, [initialState, setEntries, setIsUntouched, prefix]);

  const deleteEntry = useCallback(
    (id: string) => {
      setIsUntouched(prefix, false);
      setEntries((prevEntries) => {
        const isLastEntry = prevEntries.filter((entry) => entry.txnType !== "cancel").length <= 1;

        return prevEntries.reduce<T[]>((acc, entry) => {
          if (entry.id === id) {
            if (entry.order) {
              acc.push({
                ...entry,
                txnType: "cancel",
              } as T);
            }

            if (isLastEntry && canAddEntry) {
              acc.push(getDefaultEntry(prefix, { mode: enablePercentage ? "fitPercentage" : "keepSize" }));
            }

            return acc;
          }

          acc.push(entry as T);
          return acc;
        }, []);
      });
    },
    [prefix, canAddEntry, enablePercentage, setEntries, setIsUntouched]
  );

  const prevTotalPositionSizeUsd = usePrevious(totalPositionSizeUsd);
  useEffect(() => {
    if (
      enablePercentage &&
      totalPositionSizeUsd !== undefined &&
      totalPositionSizeUsd != (prevTotalPositionSizeUsd ?? 0n)
    ) {
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
          if (entry.txnType === "cancel" || entry.mode === "keepSize") return entry;
          return clampEntryPercentage(recalculatedEntries, entry);
        });

        return clampedEntries;
      });
    }
  }, [
    enablePercentage,
    prevTotalPositionSizeUsd,
    totalPositionSizeUsd,
    clampEntryPercentage,
    setEntries,
    recalculateEntryByField,
  ]);

  return {
    entries,
    addEntry,
    updateEntry,
    deleteEntry,
    reset,
    canAddEntry,
    allowAddEntry: canAddEntry && totalPercentage < MAX_PERCENTAGE,
  };
}
