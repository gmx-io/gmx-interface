import {
  getAssociatedTokenAddressSync
} from '@solana/spl-token';

export const getTokenEscrow = (
  action: PublicKey,
  token: PublicKey,
  tokenProgramId?: PublicKey
) => {
  return getAssociatedTokenAddressSync(token, action, true, tokenProgramId);
};