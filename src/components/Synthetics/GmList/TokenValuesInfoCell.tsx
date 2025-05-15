export function TokenValuesInfoCell({ value, usd, symbol, singleLine }: { value: string; usd?: string; symbol?: string; singleLine?: boolean }) {
  const isNumber = !isNaN(Number(value));
  const content = (
    <>
      {value && <div className="whitespace-nowrap">{symbol && isNumber ? `${value} ${symbol}` : value}</div>}
      {usd && <div className="whitespace-nowrap text-12 text-slate-100">({usd})</div>}
    </>
  );
  return singleLine ? (
    <div className="flex gap-4">
      {content}
    </div>
  ) : (
    content
  );
}
