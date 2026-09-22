import { t, Trans } from "@lingui/macro";

export function RewardsHeaderBadge() {
  return (
    <span className="rewards-live" title={t`Season 1 · Live`}>
      <i aria-hidden="true" />
      <span className="rewards-live-full">
        <Trans>Season 1 · Live</Trans>
      </span>
      <span className="rewards-live-compact">
        <Trans>Live</Trans>
      </span>
    </span>
  );
}
