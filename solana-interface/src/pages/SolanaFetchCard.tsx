import { useCallback, useEffect, useRef, useState } from "react";

import { SUPPORTED_RESOLUTIONS_V2, type TradingViewResolution } from "config/tradingview";
import { gmxSolanaRequest, HttpError } from "lib/gmxSolanaRequest";

import Button from "components/Button/Button";

import { parseSolanaCandles, type SolanaChartCandles } from "../lib/chartCandles";

type Props = {
  tokenSymbol: string;
  resolution: TradingViewResolution;
  onCandlesLoaded: (candles: SolanaChartCandles & { tokenSymbol: string }) => void;
};

export function SolanaFetchCard({ tokenSymbol, resolution, onCandlesLoaded }: Props) {
  const [response, setResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);

  const fetchCandles = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    setIsLoading(true);
    setError(null);
    setResponse("");

    try {
      const result = await gmxSolanaRequest.fetchJson<unknown>("/v2/cache/prices/candles", {
        query: { tokenSymbol, period: SUPPORTED_RESOLUTIONS_V2[resolution], limit: 2000 },
      });
      if (requestId !== requestIdRef.current) return;
      setResponse(JSON.stringify(result, null, 2));
      onCandlesLoaded({ tokenSymbol, resolution, bars: parseSolanaCandles(result) });
    } catch (cause) {
      if (requestId !== requestIdRef.current) return;
      setError(`Request failed: ${cause instanceof Error ? cause.message : String(cause)}`);
      if (cause instanceof HttpError && cause.body !== undefined) {
        setResponse(JSON.stringify(cause.body, null, 2));
      }
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [tokenSymbol, resolution, onCandlesLoaded]);

  useEffect(() => {
    const requestState = requestIdRef;
    void fetchCandles();
    return () => {
      requestState.current++;
    };
  }, [fetchCandles]);

  return (
    <section className="min-w-0 rounded-8 bg-slate-900 p-12" aria-busy={isLoading}>
      <h2 className="mb-4 text-16 font-medium">Solana Fetch</h2>
      <p className="mb-12 text-12 text-typography-secondary">
        {tokenSymbol} candles · {SUPPORTED_RESOLUTIONS_V2[resolution]} · Limit 2000
      </p>
      <div className="flex flex-col gap-8">
        <Button variant="primary" disabled={isLoading} onClick={fetchCandles}>
          {isLoading ? "Fetching..." : "Fetch candles"}
        </Button>
        {error && (
          <p role="alert" className="break-words text-14 text-red-500">
            {error}
          </p>
        )}
        <label htmlFor="solana-fetch-response" className="text-14">
          JSON response
        </label>
        <textarea
          id="solana-fetch-response"
          readOnly
          value={response}
          placeholder="Click Fetch candles to view the JSON response."
          spellCheck={false}
          rows={8}
          className="w-full min-w-0 resize-none rounded-4 border border-slate-600 bg-slate-800 p-8 font-mono text-12"
        />
      </div>
    </section>
  );
}
