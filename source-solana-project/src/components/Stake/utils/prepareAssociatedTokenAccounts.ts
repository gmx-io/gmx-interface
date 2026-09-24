import { PublicKey } from '@solana/web3.js';
import { StoreProgram } from 'gmsol';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';

export const prepareAssociatedTokenAccounts = async (
  program: StoreProgram,
  payer: PublicKey,
  owner: PublicKey,
  tokens: PublicKey[],
  tokenProgram: PublicKey = TOKEN_PROGRAM_ID
) => {
  return await Promise.all(
    tokens.map((token) => {
      const account = getAssociatedTokenAddressSync(
        token,
        owner,
        true,
        tokenProgram
      );
      return program.methods
        .prepareAssociatedTokenAccount()
        .accountsPartial({
          owner,
          payer,
          mint: token,
          account,
          tokenProgram,
        })
        .instruction();
    })
  );
};