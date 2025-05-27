export function TokenValuesInfoCell({ value, usd, symbol, singleLine }: { value: string; usd?: string; symbol?: string; singleLine?: boolean }) {
  const isNumber = !isNaN(Number(value));
  const content = (
    <>
      {usd && <div className="whitespace-nowrap ">{usd}</div>}
      {value && <div className="whitespace-nowrap text-12 text-slate-100">({symbol && isNumber ? `${value} ${symbol}` : value})</div>}
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
