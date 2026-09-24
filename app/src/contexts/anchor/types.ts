import { AnchorProvider } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';

export interface AnchorState {
  connection: Connection;
  active: boolean;
  owner?: PublicKey;
  provider: AnchorProvider;
}
