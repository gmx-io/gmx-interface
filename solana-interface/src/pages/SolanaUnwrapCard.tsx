import { useState } from "react";

import { helperToast } from "lib/helperToast";

import Button from "components/Button/Button";

import { unwrapAllWsol } from "../wallet/unwrapWsol";
import { useSolanaWallet } from "../wallet/useSolanaWallet";

export function SolanaUnwrapCard() {
  const { wallet } = useSolanaWallet();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function unwrap() {
    if (isLoading || !wallet) return;

    setIsLoading(true);
    setError(null);

    const result = await unwrapAllWsol(wallet);
    if (result.ok) helperToast.success("Successs unwrapped all WSOL to SOL" );
    else helperToast.error("Error unwrapping WSOL");

    setIsLoading(false);
  }

  return (
    <section className="min-w-0 rounded-8 bg-slate-900 p-12" aria-busy={isLoading}>
      <h2 className="mb-4 text-16 font-medium">Unwrap WSOL</h2>
      <p className="mb-12 text-12 text-typography-secondary">Close every WSOL account held by the active wallet.</p>
      <div className="flex flex-col gap-8">
        <Button variant="primary" disabled={isLoading || !wallet} onClick={unwrap}>
          {isLoading ? "Unwrapping..." : "Unwrap All WSOL to SOL"}
        </Button>
        {error && (
          <p role="alert" className="break-words text-14 text-red-500">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
