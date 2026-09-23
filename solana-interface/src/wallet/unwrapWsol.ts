import type { ConnectedStandardSolanaWallet } from "@privy-io/react-auth/solana";
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { Buffer } from "buffer";

import { refreshSolanaAssets } from "./useSolanaAssets";
import { getSolanaRpcClient } from "../lib/rpc";

// web3.js browser build calls global Buffer inside TransactionInstruction.
if (typeof globalThis.Buffer === "undefined") {
  globalThis.Buffer = Buffer;
}

export const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
export const MIN_UNWRAP_FEE_LAMPORTS = 5000n;

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

export type UnwrapAllWsolResult = { ok: true; signature: string } | { ok: false; message: string };

export function closeWsolAccountInstructions(accounts: PublicKey[], owner: PublicKey) {
  return accounts.map(
    (account) =>
      new TransactionInstruction({
        programId: TOKEN_PROGRAM_ID,
        keys: [
          { pubkey: account, isSigner: false, isWritable: true },
          { pubkey: owner, isSigner: false, isWritable: true },
          { pubkey: owner, isSigner: true, isWritable: false },
        ],
        data: Buffer.from([9]),
      })
  );
}

export function unwrapErrorMessage(cause: unknown) {
  const message = cause instanceof Error ? cause.message : String(cause);
  if (/reject/i.test(message)) return "Signature rejected.";
  return `Unwrap failed: ${message}`;
}

export async function unwrapAllWsol(
  wallet: Pick<ConnectedStandardSolanaWallet, "address" | "signTransaction">
): Promise<UnwrapAllWsolResult> {
  try {
    const connection = getSolanaRpcClient();
    const owner = new PublicKey(wallet.address);
    const [lamports, accounts] = await Promise.all([
      connection.getBalance(owner),
      connection.getTokenAccountsByOwner(owner, { mint: WSOL_MINT }),
    ]);
    const tokenAccounts = accounts.value.map((item) => item.pubkey);

    if (tokenAccounts.length === 0) return { ok: false, message: "No WSOL to unwrap." };
    if (BigInt(lamports) < MIN_UNWRAP_FEE_LAMPORTS) {
      return { ok: false, message: "Not enough SOL to pay the transaction fee." };
    }

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    const transaction = new Transaction({ feePayer: owner, recentBlockhash: blockhash }).add(
      ...closeWsolAccountInstructions(tokenAccounts, owner)
    );
    const { signedTransaction } = await wallet.signTransaction({
      transaction: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }),
      chain: "solana:mainnet",
    });
    const signature = await connection.sendRawTransaction(signedTransaction);
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
    refreshSolanaAssets(wallet.address);
    return { ok: true, signature };
  } catch (cause) {
    return { ok: false, message: unwrapErrorMessage(cause) };
  }
}
