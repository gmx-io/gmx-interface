import { msg } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { useMemo } from "react";

export type ChartPeriod = "30d" | "90d" | "180d" | "all";

export const CHART_PERIOD_DAYS: Record<ChartPeriod, number | undefined> = {
  "30d": 30,
  "90d": 90,
  "180d": 180,
  all: undefined,
};

const CHART_PERIOD_TABS = [
  { value: "30d" as const, label: msg`30d` },
  { value: "90d" as const, label: msg`90d` },
  { value: "180d" as const, label: msg`180d` },
  { value: "all" as const, label: msg`All` },
];

/** Period tabs for the GT charts, translated again when the language changes */
export function useChartPeriodTabs() {
  const { _ } = useLingui();
  return useMemo(() => CHART_PERIOD_TABS.map((tab) => ({ value: tab.value, label: _(tab.label) })), [_]);
}
