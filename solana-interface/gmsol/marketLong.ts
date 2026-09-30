import { AnchorProvider, type Wallet } from "@coral-xyz/anchor";
import type { ConnectedStandardSolanaWallet } from "@privy-io/react-auth/solana";
import { PublicKey, Transaction, VersionedTransaction, type Connection } from "@solana/web3.js";

import { makeCreateIncreaseOrderInstruction } from "./exchange/instructions/order";
import { makeStoreProgram } from "./program/store";

const USDC_DECIMALS = 6;
const LEVERAGE_DECIMALS = 4;
const SOLANA_USD_DECIMALS = 20;

export function calculateSolanaMarketLongSizeDeltaUsd(collateralAmount: bigint, leverage: bigint) {
  const collateralUsd =
    (collateralAmount * 10n ** BigInt(SOLANA_USD_DECIMALS)) / 10n ** BigInt(USDC_DECIMALS);
  return (collateralUsd * leverage) / 10n ** BigInt(LEVERAGE_DECIMALS);
}

export type SolanaMarketLongConfig = {
  store: string;
  marketToken: string;
  collateralToken: string;
  longToken: string;
  shortToken: string;
};

export type SolanaMarketLongOrder = {
  owner: string;
  collateralAmount: bigint;
  sizeDeltaUsd: bigint;
  isLong: boolean;
  triggerPrice?: bigint;
  acceptablePrice?: bigint;
  config: SolanaMarketLongConfig;
};

export type SolanaMarketLongTransaction = {
  transaction: Transaction;
  order: PublicKey;
};

function createWallet(wallet: ConnectedStandardSolanaWallet, owner: PublicKey): Wallet {
  return {
    payer: undefined as never,
    publicKey: owner,
    async signTransaction<T extends Transaction | VersionedTransaction>(transaction: T) {
      const result = await wallet.signTransaction({ transaction: transaction.serialize({ requireAllSignatures: false }) });
      const signed = transaction instanceof Transaction
        ? Transaction.from(result.signedTransaction)
        : VersionedTransaction.deserialize(result.signedTransaction);
      return signed as T;
    },
    async signAllTransactions(transactions) {
      return Promise.all(transactions.map((transaction) => this.signTransaction(transaction)));
    },
  } as Wallet;
}

export async function buildSolanaMarketLongTransaction(
  connection: Connection,
  wallet: ConnectedStandardSolanaWallet,
  input: SolanaMarketLongOrder
): Promise<SolanaMarketLongTransaction> {
  const owner = new PublicKey(input.owner);
  const store = new PublicKey(input.config.store);
  const marketToken = new PublicKey(input.config.marketToken);
  const collateralToken = new PublicKey(input.config.collateralToken);
  const longToken = new PublicKey(input.config.longToken);
  const shortToken = new PublicKey(input.config.shortToken);
  const provider = new AnchorProvider(connection, createWallet(wallet, owner), {
    commitment: "confirmed",
  });
  const program = makeStoreProgram(provider);
  const [instructions, order] = await makeCreateIncreaseOrderInstruction(program as never, {
    store,
    owner,
    marketToken,
    collateralToken,
    isLong: input.isLong,
    initialCollateralDeltaAmount: input.collateralAmount,
    sizeDeltaUsd: input.sizeDeltaUsd,
    options: {
      hint: { longToken, shortToken },
      triggerPrice: input.triggerPrice,
      acceptablePrice: input.acceptablePrice,
      shouldWrapNativeToken: false,
    },
  });
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  const transaction = new Transaction().add(...instructions);
  transaction.feePayer = owner;
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  return { transaction, order };
}

export async function signAndSendSolanaMarketLong(
  connection: Connection,
  wallet: ConnectedStandardSolanaWallet,
  input: SolanaMarketLongOrder
) {
  const { transaction, order } = await buildSolanaMarketLongTransaction(connection, wallet, input);
  const signed = await wallet.signTransaction({ transaction: transaction.serialize({ requireAllSignatures: false }) });
  const signature = await connection.sendRawTransaction(signed.signedTransaction, { preflightCommitment: "confirmed" });
  const confirmation = await connection.confirmTransaction(
    { signature, blockhash: transaction.recentBlockhash!, lastValidBlockHeight: transaction.lastValidBlockHeight! },
    "confirmed"
  );

  if (confirmation.value.err) {
    throw new Error(`Solana transaction failed: ${JSON.stringify(confirmation.value.err)}`);
  }

  const confirmedTransaction = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  const executionError = confirmedTransaction?.meta?.logMessages?.find((message) =>
    message.includes("A model error occurred") || message.includes("Execute order error")
  );
  if (executionError) {
    throw new Error(`Solana order execution failed: ${executionError}`);
  }

  return { signature, order };
}
