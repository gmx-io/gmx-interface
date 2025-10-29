import cx from "classnames";

import TokenIcon from "./TokenIcon";

type Props = {
  displaySize: number;
  symbol?: string;
  className?: string;
  importSize?: 24 | 40;
  chainIdBadge?: number | undefined;
};

export default function TokenWithIcon({ symbol, className, importSize, displaySize, chainIdBadge }: Props) {
  const classNames = cx("Token-icon inline-flex items-center whitespace-nowrap", className);

  if (!symbol) return <></>;
  return (
    <span className={classNames}>
      <TokenIcon
        className="mr-5"
        symbol={symbol}
        importSize={importSize}
        displaySize={displaySize}
        chainIdBadge={chainIdBadge}
      />
      {symbol}
    </span>
  );
}
