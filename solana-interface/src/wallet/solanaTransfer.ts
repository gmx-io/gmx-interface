import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  type Commitment,
} from "@solana/web3.js";
import bs58 from "bs58";
import { Buffer } from "buffer";

import { SOLANA_TRADE_TOKENS } from "./solanaWalletSession";
import { getSolanaRpcClient } from "../lib/rpc";

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const TOKEN_ACCOUNT_SIZE = 165;
const TRANSFER_CHECKED = 12;
const CREATE_IDEMPOTENT = 1;

export const NATIVE_SOL_MINT = "11111111111111111111111111111111";

export type SolanaSendAsset = {
  mint: string;
  symbol: string;
  amount: bigint;
  decimals: number;
  balanceUsd: bigint;
  native: boolean;
};

export type SolanaTransferRequest = {
  owner: string;
  recipient: string;
  native: boolean;
  mint: string;
  decimals: number;
  amount: bigint;
};

export type SolanaSendBlock = "invalid-recipient" | "insufficient-balance" | "insufficient-sol";

export function isSolanaAddress(value: string) {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

export function encodeSolanaSignature(signature: Uint8Array) {
  return bs58.encode(signature);
}

export function solanaTxUrl(signature: string) {
  return `https://solscan.io/tx/${signature}`;
}

export function maxSolSendAmount(balance: bigint, fee: bigint) {
  return balance > fee ? balance - fee : 0n;
}

export function solanaSendBlock(input: {
  recipient: string;
  amount: bigint;
  assetBalance: bigint;
  solBalance: bigint;
  fee: bigint;
  native: boolean;
}): SolanaSendBlock | undefined {
  if (!isSolanaAddress(input.recipient)) return "invalid-recipient";
  if (input.amount > input.assetBalance) return "insufficient-balance";
  const solCost = input.native ? input.amount + input.fee : input.fee;
  if (solCost > input.solBalance) return "insufficient-sol";
  return undefined;
}

export function collapseSolanaSendAssets(
  rows: Array<{ mint: string; symbol: string; amount: bigint; decimals: number; balanceUsd: bigint }>
): SolanaSendAsset[] {
  const spl: SolanaSendAsset[] = [];
  let native: SolanaSendAsset | undefined;

  for (const row of rows) {
    if (SOLANA_TRADE_TOKENS[row.mint]?.native) {
      native = {
        mint: NATIVE_SOL_MINT,
        symbol: "SOL",
        amount: row.amount,
        decimals: row.decimals,
        balanceUsd: row.balanceUsd,
        native: true,
      };
      continue;
    }
    spl.push({ ...row, native: false });
  }

  return native ? [native, ...spl] : spl;
}

function associatedTokenAddress(owner: PublicKey, mint: PublicKey, program: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), program.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}

function tokenProgram(owner: PublicKey) {
  if (owner.equals(TOKEN_PROGRAM_ID) || owner.equals(TOKEN_2022_PROGRAM_ID)) return owner;
  throw new Error("Unsupported token program");
}

function createAssociatedTokenAccount(payer: PublicKey, ata: PublicKey, owner: PublicKey, mint: PublicKey, program: PublicKey) {
  return new TransactionInstruction({
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: ata, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: program, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([CREATE_IDEMPOTENT]),
  });
}

function transferChecked(
  program: PublicKey,
  source: PublicKey,
  mint: PublicKey,
  destination: PublicKey,
  owner: PublicKey,
  amount: bigint,
  decimals: number
) {
  const data = Buffer.alloc(10);
  data.writeUInt8(TRANSFER_CHECKED, 0);
  data.writeBigUInt64LE(amount, 1);
  data.writeUInt8(decimals, 9);

  return new TransactionInstruction({
    programId: program,
    keys: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data,
  });
}

async function assemble(input: SolanaTransferRequest) {
  const connection = getSolanaRpcClient();
  const owner = new PublicKey(input.owner);
  const recipient = new PublicKey(input.recipient);
  const transaction = new Transaction();
  let rent = 0n;
  if (input.native) {
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: owner,
        toPubkey: recipient,
        lamports: input.amount,
      })
    );
  } else {
    const mint = new PublicKey(input.mint);
    const mintInfo = await connection.getAccountInfo(mint);
    if (!mintInfo) throw new Error("Token mint not found");
    const program = tokenProgram(mintInfo.owner);
    const source = associatedTokenAddress(owner, mint, program);
    const destination = associatedTokenAddress(recipient, mint, program);
    const [sourceInfo, destinationInfo] = await connection.getMultipleAccountsInfo([source, destination]);
    if (!destinationInfo) {
      const size = sourceInfo?.data.length ?? TOKEN_ACCOUNT_SIZE;
      rent = BigInt(await connection.getMinimumBalanceForRentExemption(size));
      transaction.add(createAssociatedTokenAccount(owner, destination, recipient, mint, program));
    }

    transaction.add(transferChecked(program, source, mint, destination, owner, input.amount, input.decimals));
  }

  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = owner;
  return { transaction, rent };
}

async function messageFee(transaction: Transaction, commitment: Commitment) {
  const fee = await getSolanaRpcClient().getFeeForMessage(transaction.compileMessage(), commitment);
  // ponytail: null fee falls back to one signature (5000 lamports). Revisit if priority fees are added.
  return BigInt(fee.value ?? 5000);
}

export type SolanaTransferQuote = {
  networkFee: bigint;
  sendFee: bigint;
  estimatedSeconds: number;
};

// Confirmed needs the landing slot plus one vote round.
const CONFIRM_SLOTS = 2;

export function estimateConfirmSeconds(sample: { numSlots: number; samplePeriodSecs: number } | undefined) {
  if (!sample || sample.numSlots <= 0 || sample.samplePeriodSecs <= 0) return undefined;
  return Math.max(1, Math.ceil((sample.samplePeriodSecs * CONFIRM_SLOTS) / sample.numSlots));
}

export function formatEstimate(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${minutes}m` : `${minutes}m ${rest}s`;
}

export async function quoteSolanaTransferFee(input: SolanaTransferRequest): Promise<SolanaTransferQuote> {
  const connection = getSolanaRpcClient();
  const [{ transaction, rent }, samples] = await Promise.all([
    assemble({ ...input, amount: input.amount > 0n ? input.amount : 1n }),
    connection.getRecentPerformanceSamples(1),
  ]);
  const networkFee = await messageFee(transaction, "confirmed");
  return {
    networkFee,
    sendFee: rent,
    estimatedSeconds: estimateConfirmSeconds(samples[0]) ?? 1,
  };
}

export async function buildSolanaTransfer(input: SolanaTransferRequest) {
  const { transaction } = await assemble(input);
  return new Uint8Array(transaction.serialize({ requireAllSignatures: false, verifySignatures: false }));
}
