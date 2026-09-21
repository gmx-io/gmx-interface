import { useEffect, useState } from "react";

import { createGmxSolanaWebSocketClient } from "lib/gmxSolanaRequest";
import type { GmxSolanaWebSocketStatus } from "sdk/utils/gmxSolanaRequest";

import Button from "components/Button/Button";

export function SolanaWebSocketCard() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [status, setStatus] = useState<GmxSolanaWebSocketStatus>("idle");
  const [response, setResponse] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEnabled) return;

    let disposed = false;
    const client = createGmxSolanaWebSocketClient({
      onStateChange(state) {
        if (disposed) return;
        setStatus(state.status);
        setError(state.error?.message ?? null);
        if (state.status === "error") setIsEnabled(false);
      },
      onOpen() {
        try {
          client.send(JSON.stringify({ subscribe: "indexTokens" }));
        } catch (cause) {
          setError(`Subscription failed: ${cause instanceof Error ? cause.message : String(cause)}`);
        }
      },
      onMessage(event) {
        try {
          const message: unknown = JSON.parse(event.data);
          if (typeof message !== "object" || message === null || !("type" in message)) {
            throw new Error("Expected a JSON object with a message type.");
          }
          if (message.type !== "indexTokens") return;

          setResponse(JSON.stringify(message, null, 2));
          setUpdatedAt(new Date().toLocaleTimeString("en-US", { hour12: false }));
          setError(null);
        } catch (cause) {
          setError(`Invalid message: ${cause instanceof Error ? cause.message : String(cause)}`);
        }
      },
    });

    client.connect();

    return () => {
      disposed = true;
      client.destroy();
    };
  }, [isEnabled]);

  function toggleConnection() {
    setError(null);
    if (isEnabled) {
      setStatus("disconnected");
    } else {
      setResponse("");
      setUpdatedAt(null);
    }
    setIsEnabled(!isEnabled);
  }

  return (
    <section className="min-w-0 rounded-8 bg-slate-900 p-12">
      <h2 className="mb-4 text-16 font-medium">Solana WebSocket</h2>
      <p className="mb-12 text-12 text-typography-secondary">Live indexTokens subscription</p>
      <div className="flex flex-col gap-8">
        <Button variant="primary" onClick={toggleConnection}>
          {isEnabled ? "Disconnect" : "Connect"}
        </Button>
        <p className="text-12 text-typography-secondary" aria-live="polite">
          Status: {status}
        </p>
        <p className="text-12 text-typography-secondary">Last update: {updatedAt ?? "No data received"}</p>
        {error && (
          <p role="alert" className="break-words text-14 text-red-500">
            {error}
          </p>
        )}
        <label htmlFor="solana-websocket-response" className="text-14">
          Latest JSON response
        </label>
        <textarea
          id="solana-websocket-response"
          readOnly
          value={response}
          placeholder="Click Connect to subscribe to indexTokens."
          spellCheck={false}
          rows={8}
          className="w-full min-w-0 resize-none rounded-4 border border-slate-600 bg-slate-800 p-8 font-mono text-12"
        />
      </div>
    </section>
  );
}
