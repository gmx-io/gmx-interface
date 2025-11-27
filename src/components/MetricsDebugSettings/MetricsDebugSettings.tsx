import { Trans } from "@lingui/macro";
import { useState } from "react";

import { MetricsDebugFlags, _debugMetrics } from "lib/metrics/_debug";

import { ExpandableRow } from "components/ExpandableRow";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";

const FLAG_LABELS: Record<MetricsDebugFlags, string> = {
  [MetricsDebugFlags.LogFreshnessMetrics]: "Log Freshness Metrics",
  [MetricsDebugFlags.LogTimings]: "Log Timings",
  [MetricsDebugFlags.LogEvents]: "Log Events",
  [MetricsDebugFlags.LogBatchItems]: "Log Batch Items",
  [MetricsDebugFlags.LogQueueState]: "Log Queue State",
  [MetricsDebugFlags.LogCounters]: "Log Counters",
  [MetricsDebugFlags.LogErrors]: "Log Errors",
};

export function MetricsDebugSettings() {
  const [open, setOpen] = useState(false);
  // eslint-disable-next-line react/hook-use-state
  const [, forceUpdate] = useState(0);

  if (!_debugMetrics) {
    return null;
  }

  const handleFlagChange = (flag: MetricsDebugFlags, checked: boolean) => {
    _debugMetrics?.setFlag(flag, checked);
    forceUpdate((prev) => prev + 1);
  };

  return (
    <ExpandableRow
      title={<Trans>Metrics Debug</Trans>}
      open={open}
      onToggle={setOpen}
      contentClassName="flex flex-col gap-8"
    >
      {Object.values(MetricsDebugFlags).map((flag) => (
        <ToggleSwitch
          key={flag}
          isChecked={_debugMetrics?.getFlag(flag) ?? false}
          setIsChecked={(checked) => handleFlagChange(flag, checked)}
        >
          <Trans>{FLAG_LABELS[flag]}</Trans>
        </ToggleSwitch>
      ))}
    </ExpandableRow>
  );
}
