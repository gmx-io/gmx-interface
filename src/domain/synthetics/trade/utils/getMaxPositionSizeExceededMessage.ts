import { t } from "@lingui/macro";

import { formatUsd } from "lib/numbers";

export function getMaxPositionSizeExceededMessage(isLong: boolean, maxSizeUsd: bigint | undefined) {
  const positionSide = isLong ? t`long` : t`short`;
  const maxSize = formatUsd(maxSizeUsd);

  return t`Order won't execute: size exceeds the max ${positionSide} size of ${maxSize}. Reduce the order size.`;
}
