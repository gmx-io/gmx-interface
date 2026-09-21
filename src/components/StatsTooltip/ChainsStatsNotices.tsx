import { Trans } from "@lingui/macro";

import { formatTimeAgo } from "lib/dates";

import type { ChainsStatsStaleEntry } from "./summarizeChainsStats";

type Props = {
  missingTitles: string[];
  staleEntries: ChainsStatsStaleEntry[];
  className?: string;
};

export function ChainsStatsNotices({ missingTitles, staleEntries, className }: Props) {
  const now = Date.now();
  const staleList = staleEntries
    .map(({ title, asOf }) => (asOf === undefined ? title : `${title} (${formatTimeAgo(asOf, now)})`))
    .join(", ");

  return (
    <>
      {missingTitles.length > 0 && (
        <p className={className}>
          <Trans>Partial total: no data yet from {missingTitles.join(", ")}.</Trans>
        </p>
      )}
      {staleEntries.length > 0 && (
        <p className={className}>
          <Trans>Included but not up to date: {staleList}.</Trans>
        </p>
      )}
    </>
  );
}
