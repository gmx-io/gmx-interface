import { Trans } from "@lingui/macro";
import cx from "classnames";

import { AnimatedGradientText } from "components/AnimatedGradientText/AnimatedGradientText";

export function RecentlyListedBadge({ className }: { className?: string }) {
  return (
    <AnimatedGradientText
      className={cx("text-body-small inline-flex items-center gap-4 rounded-4 py-4 font-medium", className)}
    >
      <Trans>New</Trans>
    </AnimatedGradientText>
  );
}
