import TokenIcon from "components/TokenIcon/TokenIcon";

export function SwapMarketIcons({
  fromSymbol,
  toSymbol,
}: {
  fromSymbol: string | undefined;
  toSymbol: string | undefined;
}) {
  return (
    <span className="inline-flex shrink-0 items-center">
      {fromSymbol ? <TokenIcon symbol={fromSymbol} displaySize={20} className="relative z-10" /> : "..."}
      {toSymbol ? <TokenIcon symbol={toSymbol} displaySize={20} className="-ml-10" /> : "..."}
    </span>
  );
}

export function SwapMarketLabel({
  fromSymbol,
  toSymbol,
  withIcons = true,
}: {
  fromSymbol: string | undefined;
  toSymbol: string | undefined;
  /** false when the label is a tooltip handle and SwapMarketIcons sit before it, so the dotted line starts at the text */
  withIcons?: boolean;
}) {
  return (
    <span className="inline-flex items-center">
      {withIcons && (
        <>
          {fromSymbol ? <TokenIcon symbol={fromSymbol} displaySize={20} className="relative z-10" /> : "..."}
          {toSymbol ? <TokenIcon symbol={toSymbol} displaySize={20} className="-ml-10 mr-5" /> : "..."}
        </>
      )}
      <span>
        {fromSymbol}/{toSymbol}
      </span>
    </span>
  );
}
