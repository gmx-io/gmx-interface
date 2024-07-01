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
    <span className={cx({ "cursor-help border-b border-dashed border-b-gray-400": bordered })}>
      {fromSymbol ? <TokenIcon symbol={fromSymbol} displaySize={20} className="relative z-10" /> : "..."}
      {toSymbol ? <TokenIcon symbol={toSymbol} displaySize={20} className="-ml-10 mr-5" /> : "..."}
      {fromSymbol}/{toSymbol}
    </span>
  );
}
