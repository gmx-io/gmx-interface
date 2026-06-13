import { Trans } from "@lingui/macro";
import cx from "classnames";

import { AnimatedGradientText } from "components/AnimatedGradientText/AnimatedGradientText";

export function RecentlyListedBadge({ className }: { className?: string }) {
  return (
    <AnimatedGradientText
      className={cx("inline-flex items-center gap-3 rounded-4 py-2 text-12 font-medium", className)}
    >
      <Trans>New</Trans>
    </AnimatedGradientText>
  );
}
