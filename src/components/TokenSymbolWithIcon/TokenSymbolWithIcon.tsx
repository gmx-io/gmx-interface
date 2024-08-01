import TokenIcon from "components/TokenIcon/TokenIcon";

export type Props = {
  symbol: string;
};

export function TokenSymbolWithIcon({ symbol }: Props) {
  return (
    <span className="whitespace-nowrap">
      <TokenIcon className="relative -top-3" symbol={symbol} displaySize={14} importSize={40} />
      &nbsp;{symbol}
    </span>
  );
}
