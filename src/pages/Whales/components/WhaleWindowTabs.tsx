import { useMemo } from "react";

import { WHALE_WINDOWS, type WhaleWindow } from "domain/synthetics/whales/period";

import Tabs from "components/Tabs/Tabs";

const LABELS: Record<WhaleWindow, string> = { total: "All time", "30d": "30D", "7d": "7D" };

export function WhaleWindowTabs({ value, onChange }: { value: WhaleWindow; onChange: (v: WhaleWindow) => void }) {
  const options = useMemo(() => WHALE_WINDOWS.map((w) => ({ label: LABELS[w], value: w })), []);
  return <Tabs options={options} selectedValue={value} onChange={onChange} type="inline" />;
}
