import { t } from "@lingui/macro";
import cx from "classnames";

import TokenIcon from "components/TokenIcon/TokenIcon";

export function MarketWithDirectionLabel({
  indexName,
  isLong,
  tokenSymbol,
}: {
  indexName: string;
  isLong: boolean;
  tokenSymbol: string;
}) {
  return (
    <div className="inline-flex items-center gap-4 leading-base">
      <TokenIcon className="size-20 !align-[-3px]" displaySize={20} symbol={tokenSymbol} />
      <span className="font-medium text-typography-primary">{indexName}</span>
      <span className={cx(isLong ? "text-green-500" : "text-red-500")}>{isLong ? t`Long` : t`Short`}</span>
    </div>
  );
}
