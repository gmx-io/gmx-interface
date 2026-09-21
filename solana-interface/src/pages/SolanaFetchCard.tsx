import { useState } from "react";

import { gmxSolanaRequest, HttpError } from "lib/gmxSolanaRequest";

import Button from "components/Button/Button";

export function SolanaFetchCard() {
  const [response, setResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function fetchCandles() {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);
    setResponse("");

    try {
      const result = await gmxSolanaRequest.fetchJson<unknown>("/v2/cache/prices/candles", {
        query: { tokenSymbol: "AUD", period: "1d", limit: 2000 },
      });
      setResponse(JSON.stringify(result, null, 2));
    } catch (cause) {
      setError(`Request failed: ${cause instanceof Error ? cause.message : String(cause)}`);
      if (cause instanceof HttpError && cause.body !== undefined) {
        setResponse(JSON.stringify(cause.body, null, 2));
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="min-w-0 rounded-8 bg-slate-900 p-12" aria-busy={isLoading}>
      <h2 className="mb-4 text-16 font-medium">Solana Fetch</h2>
      <p className="mb-12 text-12 text-typography-secondary">AUD candles · 1 day · Limit 2000</p>
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
