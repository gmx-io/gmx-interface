import { useState } from "react";
import { uniqueId } from "lodash";

export type Entry = {
  id: string;
  price: string;
  percentage: string;
  error?: string;
  pnl?: string;
};

export default function useTakeProfitEntries() {
  const [stopLossEntries, setStopLossEntries] = useState<Entry[]>([
    { id: uniqueId(), price: "", percentage: "", error: "", pnl: "" },
  ]);

  function addEntry() {
    const newEntry: Entry = {
      id: uniqueId(),
      price: "",
      percentage: "",
      error: "",
      pnl: "",
    };
    setStopLossEntries([...stopLossEntries, newEntry]);
  }

  const updateEntry = (id: string, updatedEntry: Partial<Entry>) => {
    setStopLossEntries(stopLossEntries.map((entry) => (entry.id === id ? { ...entry, ...updatedEntry } : entry)));
  };

  const deleteEntry = (id: string) => {
    if (stopLossEntries.length > 1) {
      setStopLossEntries(stopLossEntries.filter((entry) => entry.id !== id));
    }
  };
  const reset = () => {
    setStopLossEntries([{ id: uniqueId(), price: "", percentage: "" }]);
  };

  return { entries: stopLossEntries, addEntry, updateEntry, deleteEntry, reset };
}
