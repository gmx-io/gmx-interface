import { useSignAndSendTransaction } from "@privy-io/react-auth/solana";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { useState } from "react";

import Button from "components/Button/Button";

import { getSolanaRpcClient } from "../lib/rpc";
import { useSolanaWallet } from "../wallet/useSolanaWallet";

function parseSolAmount(value: string) {
  const normalized = value.trim();
  if (!/^\d+(\.\d{1,9})?$/.test(normalized)) {
    throw new Error("Enter a valid SOL amount with up to 9 decimals.");
  }

  const [whole, fraction = ""] = normalized.split(".");
  const lamports = BigInt(whole) * BigInt(LAMPORTS_PER_SOL) + BigInt(fraction.padEnd(9, "0"));
  if (lamports <= 0n) throw new Error("Enter an amount greater than 0 SOL.");
  if (lamports > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("The amount is too large.");
  return Number(lamports);
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function SolanaTransferCard() {
  const { address, wallet } = useSolanaWallet();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [signature, setSignature] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  async function handleSend() {
    if (!wallet || !address || isSending) return;

    setIsSending(true);
    setSignature("");
    setError(null);

    try {
      const destination = new PublicKey(recipient.trim());
      const lamports = parseSolAmount(amount);
      const { blockhash } = await getSolanaRpcClient().getLatestBlockhash();
      const transaction = new Transaction({
        feePayer: new PublicKey(address),
        recentBlockhash: blockhash,
      }).add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(address),
          toPubkey: destination,
          lamports,
        })
      );
      const result = await signAndSendTransaction({
        transaction: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }),
        wallet,
      });
      setSignature(bytesToHex(result.signature));
    } catch (cause) {
      setError(`Transfer failed: ${cause instanceof Error ? cause.message : String(cause)}`);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="min-w-0 rounded-8 bg-slate-900 p-12" aria-busy={isSending}>
      <h2 className="mb-4 text-16 font-medium">Solana Transfer</h2>
      <p className="mb-12 text-12 text-typography-secondary">
        {address ? `From ${address.slice(0, 4)}...${address.slice(-4)}` : "Connect a Solana wallet to send SOL."}
      </p>
      <div className="flex flex-col gap-8">
        <label htmlFor="solana-transfer-recipient" className="text-14">
          Recipient address
        </label>
        <input
          id="solana-transfer-recipient"
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
          disabled={isSending}
          className="w-full min-w-0 rounded-4 border border-slate-600 bg-slate-800 px-8 py-8 text-14"
        />
        <label htmlFor="solana-transfer-amount" className="text-14">
          Amount (SOL)
        </label>
        <input
          id="solana-transfer-amount"
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value);
            setSignature("");
            setError(null);
          }}
          placeholder="0.1"
          autoComplete="off"
          disabled={isSending}
          className="w-full min-w-0 rounded-4 border border-slate-600 bg-slate-800 px-8 py-8 text-14"
        />
        <Button
          variant="primary"
          disabled={!wallet || !recipient.trim() || !amount.trim() || isSending}
          onClick={handleSend}
        >
          {isSending ? "Sending..." : "Send SOL"}
        </Button>
        {error && (
          <p role="alert" className="break-words text-14 text-red-500">
            {error}
          </p>
        )}
        <label htmlFor="solana-transfer-signature" className="text-14">
          Transaction signature
        </label>
        <textarea
          id="solana-transfer-signature"
          readOnly
          value={signature}
          placeholder="The transaction signature will appear here after sending."
          spellCheck={false}
          rows={3}
          className="w-full min-w-0 resize-none rounded-4 border border-slate-600 bg-slate-800 p-8 font-mono text-12"
        />
      </div>
    </section>
  );
}
