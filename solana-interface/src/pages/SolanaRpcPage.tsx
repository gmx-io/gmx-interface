import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { useState, type FormEvent } from "react";

import Button from "components/Button/Button";

import { getSolanaRpcClient } from "../lib/rpc";

export function SolanaRpcPage() {
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;

    setBalance(null);
    setError(null);

    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(address.trim());
    } catch {
      setError("Enter a valid Solana address.");
      return;
    }

    setIsLoading(true);
    try {
      const lamports = await getSolanaRpcClient().getBalance(publicKey);
      setBalance(lamports);
    } catch (cause) {
      setError(`Failed to fetch SOL balance: ${cause instanceof Error ? cause.message : String(cause)}`);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="min-w-0 rounded-8 bg-slate-900 p-12">
      <h1 className="mb-4 text-16 font-medium">Solana RPC</h1>
      <p className="mb-12 text-12 text-typography-secondary">Check the SOL balance of any Solana address.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-8" aria-busy={isLoading}>
        <label htmlFor="solana-rpc-address" className="text-14">
          Solana address
        </label>
        <input
          id="solana-rpc-address"
          type="text"
          value={address}
          onChange={(event) => {
            setAddress(event.target.value);
            setBalance(null);
            setError(null);
          }}
          placeholder="Enter a Solana address"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          disabled={isLoading}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "solana-rpc-error" : undefined}
          className="w-full min-w-0 rounded-4 border border-slate-600 bg-slate-800 px-8 py-8 text-14"
        />
        <Button variant="primary" type="submit" disabled={isLoading || !address.trim()}>
          {isLoading ? "Checking..." : "Check balance"}
        </Button>
        {error && (
          <p id="solana-rpc-error" role="alert" className="break-words text-14 text-red-500">
            {error}
          </p>
        )}
        <div aria-live="polite">
          {balance !== null && (
            <p className="break-words text-14 font-medium">
              Balance: {(balance / LAMPORTS_PER_SOL).toLocaleString("en-US", { maximumFractionDigits: 9 })} SOL
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
