import { useMemo } from "react";

import { WHALE_WINDOWS, type WhaleWindow } from "domain/synthetics/whales/period";

import Tabs from "components/Tabs/Tabs";

const LABELS: Record<WhaleWindow, string> = {
  total: "All time",
  "1y": "1Y",
  "180d": "180D",
  "90d": "90D",
  "30d": "30D",
  "7d": "7D",
};

export function WhaleWindowTabs({
  value,
  onChange,
  windows = WHALE_WINDOWS,
}: {
  value: WhaleWindow;
  onChange: (v: WhaleWindow) => void;
  windows?: WhaleWindow[];
}) {
  const options = useMemo(() => windows.map((w) => ({ label: LABELS[w], value: w })), [windows]);
  return <Tabs options={options} selectedValue={value} onChange={onChange} type="inline" />;
}
