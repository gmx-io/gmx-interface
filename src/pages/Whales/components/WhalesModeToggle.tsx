import { useMemo } from "react";

import Tabs from "components/Tabs/Tabs";

export type WhalesMode = "markets" | "whales";

export function WhalesModeToggle({ mode, onChange }: { mode: WhalesMode; onChange: (m: WhalesMode) => void }) {
  const options = useMemo(
    () => [
      { label: "Markets", value: "markets" as const },
      { label: "Whales", value: "whales" as const },
    ],
    []
  );
  return <Tabs options={options} selectedValue={mode} onChange={onChange} type="block" />;
}
