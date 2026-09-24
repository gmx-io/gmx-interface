import {
  TOKEN_PROGRAM_ID,
  ACCOUNT_SIZE,
} from '@solana/spl-token';
import type {
  Connection,
  PublicKey,
} from '@solana/web3.js';
import { useEffect } from 'react';

export const TOKEN_BALANCES_SUBSCRIPTION = 'token-balances-subscription';

export type TokenBalanceUpdatedCallback = (
  slot: number,
  address: PublicKey,
  owner: PublicKey,
  balance: any
) => void;

export function useSubscribeTokenBalances(
  connection: Connection | null,
  owner: PublicKey | null,
  onTokenBalanceUpdated: TokenBalanceUpdatedCallback,
  tokenProgramId: PublicKey = TOKEN_PROGRAM_ID
) {
  useEffect(() => {
    if (!connection || !owner) return;
    const subscription = connection.onProgramAccountChange(
      tokenProgramId,
      (accountInfo, context) => {
        console.log('token account update', accountInfo);
      },
      {
        filters: [
          {
            dataSize: ACCOUNT_SIZE,
          },
          {
            memcmp: {
              offset: 32,
              bytes: owner.toBase58(),
            },
          },
        ],
      }
    );

    return () => {
      void connection.removeProgramAccountChangeListener(subscription);
    };
  }, [connection, onTokenBalanceUpdated, owner, tokenProgramId]);
}
