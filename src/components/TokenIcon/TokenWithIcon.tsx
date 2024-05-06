import TokenIcon from "./TokenIcon";
import cx from "classnames";

type Props = {
  displaySize: number;
  symbol?: string;
  className?: string;
  importSize?: 24 | 40;
};

export default function TokenWithIcon({ symbol, className, importSize, displaySize }: Props) {
  const classNames = cx("inline-flex items-center whitespace-nowrap Token-icon", className);

  if (!symbol) return <></>;
  return (
    <span className={classNames}>
      <TokenIcon className="mr-5" symbol={symbol} importSize={importSize} displaySize={displaySize} />
      {symbol}
    </span>
  );
}
