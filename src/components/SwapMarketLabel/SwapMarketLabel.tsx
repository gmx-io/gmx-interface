import TokenIcon from "components/TokenIcon/TokenIcon";

export function SwapMarketLabel({
  fromSymbol,
  toSymbol,
}: {
  fromSymbol: string | undefined;
  toSymbol: string | undefined;
}) {
  return (
    <span className="inline-flex items-center">
      {fromSymbol ? <TokenIcon symbol={fromSymbol} displaySize={20} className="relative z-10" /> : "..."}
      {toSymbol ? <TokenIcon symbol={toSymbol} displaySize={20} className="-ml-10 mr-5" /> : "..."}
      <span>
        {fromSymbol}/{toSymbol}
      </span>
    </span>
  );
}
