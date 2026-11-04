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
      {toSymbol ? <TokenIcon symbol={toSymbol} displaySize={20} className="-ml-8 mr-4" /> : "..."}
      <span>
        {fromSymbol}/{toSymbol}
      </span>
    </span>
  );
}
