import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { useRef, useState } from "react";

import { useChainId } from "lib/chains";

import Button from "components/Button/Button";

import { getSolanaRpcClient } from "../lib/rpc";
import { useSolanaWallet } from "../wallet/useSolanaWallet";

export function SolanaSendCard() {
  const { isSolana } = useChainId();
  const { address, wallet } = useSolanaWallet();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [signature, setSignature] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const sendingRef = useRef(false);
  const canSend = isSolana && Boolean(address) && Boolean(wallet);

  async function sendSol() {
    if (!canSend || !wallet || !address || sendingRef.current) return;

    sendingRef.current = true;
    setIsLoading(true);
    setSignature("");
    setError(null);

    try {
      let recipientPublicKey: PublicKey;
      try {
        recipientPublicKey = new PublicKey(recipient.trim());
      } catch {
        throw new Error("Enter a valid Solana recipient address.");
      }

      const normalizedAmount = amount.trim();
      if (!/^\d+(\.\d{1,9})?$/.test(normalizedAmount)) {
        throw new Error("Enter a positive SOL amount with at most 9 decimal places.");
      }
      const [whole, fraction = ""] = normalizedAmount.split(".");
      const lamports = BigInt(whole) * 1_000_000_000n + BigInt(fraction.padEnd(9, "0"));
      if (lamports <= 0n || lamports > 18_446_744_073_709_551_615n) {
        throw new Error("SOL amount is outside the valid transfer range.");
      }

      const connection = getSolanaRpcClient();
      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      const sender = new PublicKey(address);
      const transaction = new Transaction({ feePayer: sender, recentBlockhash: blockhash }).add(
        SystemProgram.transfer({ fromPubkey: sender, toPubkey: recipientPublicKey, lamports })
      );
      const { signedTransaction } = await wallet.signTransaction({
        transaction: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }),
      });
      const transactionSignature = await connection.sendRawTransaction(signedTransaction, {
        preflightCommitment: "confirmed",
      });
      setSignature(transactionSignature);
    } catch (cause) {
      setError(`Send failed: ${cause instanceof Error ? cause.message : String(cause)}`);
    } finally {
      sendingRef.current = false;
      setIsLoading(false);
    }
  }

  return (
    <section className="min-w-0 rounded-8 bg-slate-900 p-12" aria-busy={isLoading}>
      <h2 className="mb-4 text-16 font-medium">Solana Send SOL</h2>
      <p className="mb-12 text-12 text-typography-secondary">Send SOL from the connected wallet. Network fees apply.</p>
      <div className="flex flex-col gap-8">
        <label htmlFor="solana-send-recipient" className="text-14">
          Recipient address
        </label>
        <input
          id="solana-send-recipient"
          type="text"
          value={recipient}
          onChange={(event) => {
            setRecipient(event.target.value);
            setSignature("");
            setError(null);
          }}
          placeholder="Enter a Solana address"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          disabled={isLoading}
          className="w-full min-w-0 rounded-4 border border-slate-600 bg-slate-800 px-8 py-8 text-14"
        />
        <label htmlFor="solana-send-amount" className="text-14">
          Amount (SOL)
        </label>
        <input
          id="solana-send-amount"
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value);
            setSignature("");
            setError(null);
          }}
          placeholder="0.0"
          autoComplete="off"
          disabled={isLoading}
          className="w-full min-w-0 rounded-4 border border-slate-600 bg-slate-800 px-8 py-8 text-14"
        />
        <Button variant="primary" disabled={!canSend || isLoading} onClick={sendSol}>
          {isLoading ? "Sending..." : "Send"}
        </Button>
        {error && (
          <p role="alert" className="break-words text-14 text-red-500">
            {error}
          </p>
        )}
        <div aria-live="polite">
          {signature && (
            <p className="break-all text-14">Transaction submitted (confirmation pending): {signature}</p>
          )}
        </div>
      </div>
    </section>
  );
}
