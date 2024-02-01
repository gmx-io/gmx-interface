import { NUMBER_WITH_TWO_DECIMALS } from "components/PercentageInput/PercentageInput";
import { removeTrailingZeros } from "lib/numbers";
import { uniqueId } from "lodash";
import { useCallback, useMemo, useState } from "react";

const MAX_PERCENTAGE = 100;

export type OrderEntry = {
  id: string;
  price: string;
  percentage: string;
  error?: null | {
    price?: string;
    percentage?: string;
  };
};

export type OrderEntriesInfo = {
  entries: OrderEntry[];
  addEntry: () => void;
  canAddEntry: boolean;
  updateEntry: (id: string, updatedEntry: Partial<OrderEntry>) => void;
  deleteEntry: (id: string) => void;
  reset: () => void;
};

function getDefaultEntry(id: string, override?: Partial<OrderEntry>) {
  return { id: uniqueId(id), price: "", percentage: "100", error: null, ...override };
}

export default function useOrderEntries(
  id: string,
  errorHandler: (entry: Partial<OrderEntry>) => Partial<OrderEntry>
): OrderEntriesInfo {
  const [entries, setEntries] = useState<OrderEntry[]>([getDefaultEntry(id)]);

  const totalPercentage = useMemo(() => {
    return entries.reduce((total, entry) => total + Number(entry.percentage), 0);
  }, [entries]);

  const addEntry = useCallback(() => {
    if (totalPercentage <= MAX_PERCENTAGE) {
      const leftPercentage = MAX_PERCENTAGE - totalPercentage;
      setEntries((prevEntries) => [...prevEntries, getDefaultEntry(id, { percentage: String(leftPercentage) })]);
    }
  }, [totalPercentage, id]);

  const updateEntry = useCallback(
    (id: string, updatedEntry: Partial<OrderEntry>) => {
      setEntries((prevEntries) => {
        const totalExcludingCurrent = prevEntries.reduce(
          (total, entry) => total + (entry.id !== id ? Number(entry.percentage) : 0),
          0
        );

        if (totalExcludingCurrent + Number(updatedEntry.percentage) > MAX_PERCENTAGE) {
          const remainingPercentage = String(removeTrailingZeros((MAX_PERCENTAGE - totalExcludingCurrent).toFixed(2)));

          if (NUMBER_WITH_TWO_DECIMALS.test(remainingPercentage)) {
            updatedEntry.percentage = remainingPercentage;
          }
        }

        return prevEntries.map((entry) =>
          entry.id === id ? { ...entry, ...updatedEntry, ...errorHandler(updatedEntry) } : entry
        );
      });
    },
    [errorHandler]
  );

  const reset = useCallback(() => setEntries([getDefaultEntry(id)]), [id]);

  const deleteEntry = useCallback(
    (id: string) => {
      setEntries((prevEntries) => {
        if (prevEntries.length > 1) {
          return prevEntries.filter((entry) => entry.id !== id);
        } else {
          reset();
          return prevEntries;
        }
      });
    },
    [reset]
  );

  return { entries, addEntry, updateEntry, deleteEntry, reset, canAddEntry: totalPercentage <= MAX_PERCENTAGE };
}
