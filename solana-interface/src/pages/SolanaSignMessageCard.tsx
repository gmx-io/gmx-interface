import { useSignMessage } from "@privy-io/react-auth/solana";
import { useState } from "react";

import Button from "components/Button/Button";

import { useSolanaWallet } from "../wallet/useSolanaWallet";

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function SolanaSignMessageCard() {
  const { address, wallet } = useSolanaWallet();
  const { signMessage } = useSignMessage();
  const [message, setMessage] = useState("");
  const [signature, setSignature] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  async function handleSign() {
    if (!wallet || !message.trim() || isSigning) return;

    setIsSigning(true);
    setSignature("");
    setError(null);

    try {
      const result = await signMessage({
        message: new TextEncoder().encode(message),
        wallet,
      });
      setSignature(bytesToHex(result.signature));
    } catch (cause) {
      setError(`Signing failed: ${cause instanceof Error ? cause.message : String(cause)}`);
    } finally {
      setIsSigning(false);
    }
  }

  return (
    <section className="min-w-0 rounded-8 bg-slate-900 p-12" aria-busy={isSigning}>
      <h2 className="mb-4 text-16 font-medium">Solana Sign Message</h2>
      <p className="mb-12 text-12 text-typography-secondary">
        {address ? `Sign with ${address.slice(0, 4)}...${address.slice(-4)}` : "Connect a Solana wallet to sign."}
      </p>
      <div className="flex flex-col gap-8">
        <label htmlFor="solana-sign-message" className="text-14">
          Message
        </label>
        <input
          id="solana-sign-message"
          type="text"
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
            setSignature("");
            setError(null);
          }}
          placeholder="Enter a message to sign"
          autoComplete="off"
          disabled={isSigning}
          className="w-full min-w-0 rounded-4 border border-slate-600 bg-slate-800 px-8 py-8 text-14"
        />
        <Button variant="primary" disabled={!wallet || !message.trim() || isSigning} onClick={handleSign}>
          {isSigning ? "Signing..." : "Sign message"}
        </Button>
        {error && (
          <p role="alert" className="break-words text-14 text-red-500">
            {error}
          </p>
        )}
        <label htmlFor="solana-signature" className="text-14">
          Signature
        </label>
        <textarea
          id="solana-signature"
          readOnly
          value={signature}
          placeholder="The signature will appear here after signing."
          spellCheck={false}
          rows={3}
          className="w-full min-w-0 resize-none rounded-4 border border-slate-600 bg-slate-800 p-8 font-mono text-12"
        />
      </div>
    </section>
  );
}
