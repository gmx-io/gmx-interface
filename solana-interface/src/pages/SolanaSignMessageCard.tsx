import { useState } from "react";

import Button from "components/Button/Button";
import { useChainId } from "lib/chains";
import { useSolanaWallet } from "solana-interface/wallet/useSolanaWallet";

function encodeBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function SolanaSignMessageCard() {
  const { isSolana } = useChainId();
  const { address, wallet } = useSolanaWallet();
  const [message, setMessage] = useState("");
  const [signature, setSignature] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const canSign = isSolana && Boolean(address) && Boolean(wallet);

  async function signMessage() {
    if (!canSign || !wallet || !address || isLoading) return;

    setIsLoading(true);
    setSignature("");
    setError(null);

    try {
      const result = await wallet.signMessage({
        message: new TextEncoder().encode(message),
      });
      setSignature(encodeBase64(result.signature));
    } catch (cause) {
      setError(`Signature failed: ${cause instanceof Error ? cause.message : String(cause)}`);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="min-w-0 rounded-8 bg-slate-900 p-12" aria-busy={isLoading}>
      <h2 className="mb-4 text-16 font-medium">Solana Sign Message</h2>
      <p className="mb-12 text-12 text-typography-secondary">Sign arbitrary text with the connected Solana wallet.</p>
      <div className="flex flex-col gap-8">
        <label htmlFor="solana-sign-message-input" className="text-14">
          Message
        </label>
        <textarea
          id="solana-sign-message-input"
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
            setSignature("");
            setError(null);
          }}
          placeholder="Enter a message to sign"
          rows={3}
          className="w-full min-w-0 resize-none rounded-4 border border-slate-600 bg-slate-800 p-8 text-14"
        />
        <Button variant="primary" disabled={!canSign || isLoading} onClick={signMessage}>
          {isLoading ? "Signing..." : "Sign message"}
        </Button>
        {error && (
          <p role="alert" className="break-words text-14 text-red-500">
            {error}
          </p>
        )}
        <div aria-live="polite">
          <label htmlFor="solana-signature-output" className="text-14">
            Signature (Base64)
          </label>
          <textarea
            id="solana-signature-output"
            readOnly
            value={signature}
            placeholder="The signature will appear here."
            spellCheck={false}
            rows={3}
            className="mt-8 w-full min-w-0 resize-none rounded-4 border border-slate-600 bg-slate-800 p-8 font-mono text-12"
          />
        </div>
      </div>
    </section>
  );
}
