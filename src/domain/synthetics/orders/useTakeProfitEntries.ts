import { useState } from "react";
import { uniqueId } from "lodash";

export type Entry = {
  id: string;
  price: string;
  percentage: string;
  error?: string;
};

export default function useTakeProfitEntries() {
  const [takeProfitEntries, setTakeProfitEntries] = useState<Entry[]>([
    { id: uniqueId(), price: "", percentage: "", error: "" },
  ]);

  function addEntry() {
    const newEntry: Entry = {
      id: uniqueId(),
      price: "",
      percentage: "",
      error: "",
    };
    setTakeProfitEntries([...takeProfitEntries, newEntry]);
  }

  const updateEntry = (id: string, updatedEntry: Partial<Entry>) => {
    setTakeProfitEntries(takeProfitEntries.map((entry) => (entry.id === id ? { ...entry, ...updatedEntry } : entry)));
  };

  const deleteEntry = (id: string) => {
    if (takeProfitEntries.length > 1) {
      setTakeProfitEntries(takeProfitEntries.filter((entry) => entry.id !== id));
    }
  };
  const reset = () => {
    setTakeProfitEntries([{ id: uniqueId(), price: "", percentage: "" }]);
  };

  return { entries: takeProfitEntries, addEntry, updateEntry, deleteEntry, reset };
}
