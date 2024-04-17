import { useCallback, useEffect, useMemo, SetStateAction, Dispatch } from "react";
import { BigNumber } from "ethers";
import { USD_DECIMALS } from "lib/legacy";
import { usePrevious } from "lib/usePrevious";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  makeSelectConfirmationBoxSidecarOrdersState,
  makeSelectConfirmationBoxSidecarOrdersTotalPercentage,
} from "context/SyntheticsStateContext/selectors/sidecarOrdersSelectors";
import { selectConfirmationBoxSidecarOrdersTotalSizeUsd } from "context/SyntheticsStateContext/selectors/sidecarOrdersSelectors";
import { MAX_PERCENTAGE, PERCENTAGE_DECEMALS, getDefaultEntryField, getDefaultEntry } from "./utils";
import { SidecarOrderEntryBase, EntryField, SidecarOrderEntryGroupBase, GroupPrefix } from "./types";
import useEffectOnce from "lib/useEffectOnce";

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
  const totalPositionSizeUsd = useSelector(selectConfirmationBoxSidecarOrdersTotalSizeUsd);

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
    (entry: SidecarOrderEntryBase, field: "sizeUsd" | "percentage" | "price", nextField?: Partial<EntryField>) => {
      let { sizeUsd, percentage, price } = entry;

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

  const ordersState = useSelector(makeSelectConfirmationBoxSidecarOrdersState(prefix));

  const [entries, setEntries] = ordersState as any as [T[], Dispatch<SetStateAction<T[]>>];

  useEffectOnce(() => {
    setEntries(initialState);
  });

  const totalPercentage = useSelector(makeSelectConfirmationBoxSidecarOrdersTotalPercentage(prefix));

  const clampEntryPercentage = useCallback(
    (entries: SidecarOrderEntryBase[], entry: T) => {
      const totalPercentageExcludingCurrent = entries
        .filter((ent) => ent.txnType !== "cancel")
        .reduce(
          (total, ent) => total.add(ent.id !== entry.id && ent.percentage?.value ? ent.percentage.value : 0),
          BigNumber.from(0)
        );

      const maxPercentage = MAX_PERCENTAGE.sub(totalPercentageExcludingCurrent);

      let nextEntry = entry;

      if (entry.percentage.value?.gt(maxPercentage) || entry.mode === "fitPercentage") {
        nextEntry = recalculateEntryByField(entry, "percentage", { value: maxPercentage });
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
            mode: enablePercentage ? "fitPercentage" : "keepSize",
          }),
          "percentage",
          { value: leftPercentage }
        ),
      ]);
    }
  }, [totalPercentage, enablePercentage, prefix, setEntries, recalculateEntryByField]);

  const updateEntry = useCallback(
    (id: string, field: "price" | "sizeUsd" | "percentage", value: string) => {
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
    [enablePercentage, clampEntryPercentage, setEntries, recalculateEntryByField, errorHandler]
  );

  const reset = useCallback(() => setEntries(initialState), [initialState, setEntries]);

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
    [prefix, canAddEntry, enablePercentage, setEntries]
  );

  const prevTotalPositionSizeUsd = usePrevious(totalPositionSizeUsd);
  useEffect(() => {
    if (enablePercentage && totalPositionSizeUsd && !totalPositionSizeUsd.eq(prevTotalPositionSizeUsd ?? 0)) {
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
    allowAddEntry: canAddEntry && totalPercentage.lte(MAX_PERCENTAGE),
  };
}
