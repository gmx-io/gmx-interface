import { t } from "@lingui/macro";
import cx from "classnames";

import TokenIcon from "components/TokenIcon/TokenIcon";

export function MarketWithDirectionLabel({
  indexName,
  isLong,
  tokenSymbol,
  bordered,
}: {
  indexName: string;
  isLong: boolean;
  tokenSymbol: string;
  bordered?: boolean;
}) {
  return (
    <div
      className={cx("inline-block leading-base", {
        "border-b border-dashed border-b-gray-400": bordered,
      })}
    >
      <span className={cx(isLong ? "text-green-500" : "text-red-500")}>{isLong ? t`Long` : t`Short`}</span>
      <TokenIcon className="mx-5" displaySize={20} symbol={tokenSymbol} />
      <span>{indexName}</span>
    </div>
  );
}
