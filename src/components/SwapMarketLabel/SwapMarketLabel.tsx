import cx from "classnames";

import TokenIcon from "components/TokenIcon/TokenIcon";

export function SwapMarketLabel({
  fromSymbol,
  toSymbol,
  bordered,
}: {
  fromSymbol: string | undefined;
  toSymbol: string | undefined;
  bordered?: boolean;
}) {
  return (
    <span className={cx("inline-flex items-center", { "cursor-help": bordered })}>
      {fromSymbol ? <TokenIcon symbol={fromSymbol} displaySize={20} className="relative z-10" /> : "..."}
      {toSymbol ? <TokenIcon symbol={toSymbol} displaySize={20} className="-ml-8 mr-4" /> : "..."}
      <span className={cx({ "border-b border-dashed border-b-textIcon-secondary font-medium": bordered })}>
        {fromSymbol}/{toSymbol}
      </span>
    </span>
  );
}
