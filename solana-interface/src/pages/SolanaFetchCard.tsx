import { useCallback, useEffect, useRef, useState } from "react";

import { SUPPORTED_RESOLUTIONS_V2, type TradingViewResolution } from "config/tradingview";
import { gmxSolanaRequest, HttpError } from "lib/gmxSolanaRequest";

import Button from "components/Button/Button";

import { parseSolanaCandles, type SolanaChartCandles } from "../lib/chartCandles";

type Props = {
  resolution: TradingViewResolution;
  onCandlesLoaded: (candles: SolanaChartCandles) => void;
};

export function SolanaFetchCard({ resolution, onCandlesLoaded }: Props) {
  const [response, setResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasRequestedInitialCandles = useRef(false);

  const fetchCandles = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);
    setResponse("");

    try {
      const result = await gmxSolanaRequest.fetchJson<unknown>("/v2/cache/prices/candles", {
        query: { tokenSymbol: "SOL", period: SUPPORTED_RESOLUTIONS_V2[resolution], limit: 2000 },
      });
      setResponse(JSON.stringify(result, null, 2));
      onCandlesLoaded({ resolution, bars: parseSolanaCandles(result) });
    } catch (cause) {
      setError(`Request failed: ${cause instanceof Error ? cause.message : String(cause)}`);
      if (cause instanceof HttpError && cause.body !== undefined) {
        setResponse(JSON.stringify(cause.body, null, 2));
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, resolution, onCandlesLoaded]);

  useEffect(() => {
    if (hasRequestedInitialCandles.current) return;
    hasRequestedInitialCandles.current = true;
    void fetchCandles();
  }, [fetchCandles]);

  return (
    <section className="min-w-0 rounded-8 bg-slate-900 p-12" aria-busy={isLoading}>
      <h2 className="mb-4 text-16 font-medium">Solana Fetch</h2>
      <p className="mb-12 text-12 text-typography-secondary">
        SOL candles · {SUPPORTED_RESOLUTIONS_V2[resolution]} · Limit 2000
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
