import cx from "classnames";

import TokenIcon from "./TokenIcon";

type Props = {
  displaySize: number;
  symbol?: string;
  className?: string;
};

export default function TokenWithIcon({ symbol, className, displaySize }: Props) {
  const classNames = cx("Token-icon inline-flex items-center whitespace-nowrap", className);

  if (!symbol) return <></>;
  return (
    <span className={classNames}>
      <TokenIcon className="mr-5" symbol={symbol} displaySize={displaySize} />
      {symbol}
    </span>
  );
}
