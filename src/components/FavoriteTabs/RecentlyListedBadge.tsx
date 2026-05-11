import { Trans } from "@lingui/macro";

export function RecentlyListedBadge() {
  return (
    <span className="inline-flex items-center gap-3 rounded-4 py-2 text-12 font-medium text-blue-300">
      <Trans>New</Trans>
    </span>
  );
}
