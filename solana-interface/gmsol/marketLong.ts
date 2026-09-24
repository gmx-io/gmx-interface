import { AnchorProvider, type Wallet } from "@coral-xyz/anchor";
import type { ConnectedStandardSolanaWallet } from "@privy-io/react-auth/solana";
import { PublicKey, Transaction, VersionedTransaction, type Connection } from "@solana/web3.js";

import { makeCreateIncreaseOrderInstruction } from "./exchange/instructions/order";
import { makeStoreProgram } from "./program/store";

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
    isLong: true,
    initialCollateralDeltaAmount: input.collateralAmount,
    sizeDeltaUsd: input.sizeDeltaUsd,
    options: {
      hint: { longToken, shortToken },
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
  await connection.confirmTransaction(
    { signature, blockhash: transaction.recentBlockhash!, lastValidBlockHeight: transaction.lastValidBlockHeight! },
    "confirmed"
  );
  return { signature, order };
}
