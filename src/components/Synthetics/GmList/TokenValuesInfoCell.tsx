import cx from "classnames";

export function TokenValuesInfoCell({
  value,
  usd,
  symbol,
  singleLine,
  className,
}: {
  value: string;
  usd?: string;
  symbol?: string;
  singleLine?: boolean;
  className?: string;
}) {
  const isNumber = !isNaN(Number(value.replace(/,/g, "")));
  const content = (
    <>
      {usd && <div className={cx("whitespace-nowrap numbers", className)}>{usd}</div>}
      {value && (
        <div className="whitespace-nowrap text-12 text-typography-secondary numbers">
          ({symbol && isNumber ? `${value} ${symbol}` : value})
        </div>
      )}
    </>
  );
  return singleLine ? <div className="flex gap-4">{content}</div> : <div>{content}</div>;
}
