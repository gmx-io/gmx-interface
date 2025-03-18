export function TokenValuesInfoCell({ value, usd, symbol }: { value: string; usd?: string; symbol?: string }) {
  const isNumber = !isNaN(Number(value));
  return (
    <>
      {value && <div className="whitespace-nowrap">{symbol && isNumber ? `${value} ${symbol}` : value}</div>}
      {usd && <div className="whitespace-nowrap text-12 text-slate-100">({usd})</div>}
    </>
  );
}
