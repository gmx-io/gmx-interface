import { AnchorProvider } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';

export const makeNullWalletProvider = (connection: Connection) => {
  return new AnchorProvider(connection, {
    publicKey: PublicKey.unique(),
    signTransaction: <T>(tx: T) => Promise.resolve(tx),
    signAllTransactions: <T>(txs: T[]) => Promise.resolve(txs),
  });
};
