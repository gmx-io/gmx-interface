import { t } from "@lingui/macro";
import cx from "classnames";

import TokenIcon from "components/TokenIcon/TokenIcon";

export function MarketWithDirectionLabel({
  indexName,
  isLong,
  tokenSymbol,
  bordered,
  iconImportSize,
}: {
  indexName: string;
  isLong: boolean;
  tokenSymbol: string;
  bordered?: boolean;
  iconImportSize?: 24 | 40;
}) {
  return (
    <div
      className={cx("inline-flex items-center gap-4 leading-base", {
        "cursor-help": bordered,
      })}
    >
      <TokenIcon className="size-20 !align-[-3px]" displaySize={20} symbol={tokenSymbol} importSize={iconImportSize} />
      <span className="border-b border-dashed border-b-gray-400 font-medium">{indexName}</span>
      <span className={cx(isLong ? "text-green-500" : "text-red-500")}>{isLong ? t`Long` : t`Short`}</span>
    </div>
  );
}
