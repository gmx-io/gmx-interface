import { useEffect, useState } from "react";

// const URL_PATH = "https://api.coingecko.com/api/v3/simple/price";
const symbolToIdMap: Record<string, string> = {
  // Stocks
  tsla: "tsla",
  mstr: "mstr",
  amzn: "amzn",
  meta: "meta",
  msft: "msft",
  spy: "spy",
  nvda: "nvda",
  googl: "googl",
  qqq: "qqq",
  aapl: "aapl",
  // Commodities
  xag: "xag",
  xau: "xau",
  // Forex
  aud: "aud",
  nzd: "nzd",
  gbp: "gbp",
  eur: "eur",
  usdchf: "usdchf",
  usdjpy: "usdjpy",
  usdcad: "usdcad",
  usdmxn: "usdmxn",
};

export type TokenMarketInfo = {
  symbol: string;
  id: string;
  price: number;
  marketCap: number;
};

export function useTokenMarketCap(
  symbols: string[],
  refreshInterval = 0
) {
  const [data, setData] = useState<TokenMarketInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function fetchData() {
    try {
      setLoading(true);
      setError(null);

      // symbol → id
      const ids = symbols
        .map((s) => {
          return symbolToIdMap[s.symbol.toLowerCase()];
        })
        .filter(Boolean);

      if (ids.length === 0) {
        throw new Error("No valid CoinGecko IDs found for symbols");
      }

      // Request price+market value
      // const url =
      //   URL_PATH +
      //   `?ids=${ids.join(",")}` +
      //   `&vs_currencies=usd` +
      //   `&include_market_cap=true`;

      // const resp = await fetch(url);
      // const json = await resp.json();
      // console.log('json', json)

      // Convert to array structure
      const list: TokenMarketInfo[] = Object.entries(symbolToIdMap)
        .filter(([id]) => {
          return ids.includes(id);
        })
        .map(([symbol, id]) => ({
          symbol,
          id,
          // price: json[id]?.usd ?? 0,
          // marketCap: json[id]?.usd_market_cap ?? 0,
        }));

      // Sort by market value (large → small)
      // list.sort((a, b) => b.marketCap - a.marketCap);
      // console.log('list', ids)

      setData(list);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [symbols.join(",")]);

  // Optional: Polling refresh
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) return;

    const timer = setInterval(() => {
      fetchData();
    }, refreshInterval);

    return () => clearInterval(timer);
  }, [refreshInterval, symbols.join(",")]);

  return { data, loading, error, refresh: fetchData };
}
