import { PublicKey } from '@solana/web3.js';
import { makeInvoke, toBN } from '../main';
import { StoreProgram } from '../program';
import { wrap } from '../program/tokenWrap';
import {
  getTokenAccount,
  prepareAssociatedTokenAccounts,
} from '../exchange/instructions/utils';
import {
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { findWrappedMintAuthorityPDA, findWrappedMintPDA } from './pda';
import { BN } from '@coral-xyz/anchor';

export type MakeWrapParams = {
  amount: number | bigint | BN;
  owner: PublicKey;
  unwrappedMint: PublicKey;
  unwrappedTokenAccount?: PublicKey;
  unwrappedTokenProgramId?: PublicKey;
  wrappedTokenProgramId?: PublicKey;
};

export const makeWrapInstruction = async (
  storeProgram: StoreProgram,
  {
    amount,
    owner,
    unwrappedMint,
    unwrappedTokenAccount,
    unwrappedTokenProgramId: maybeUnwrappedTokenProgramId,
    wrappedTokenProgramId: maybeWrappedTokenProgramId,
  }: MakeWrapParams
) => {
  const unwrappedTokenProgramId =
    maybeUnwrappedTokenProgramId ?? TOKEN_2022_PROGRAM_ID;
  const wrappedTokenProgramId = maybeWrappedTokenProgramId ?? TOKEN_PROGRAM_ID;
  const wrappedMintAddress = findWrappedMintPDA(
    unwrappedMint,
    wrappedTokenProgramId
  )[0];
  const wrappedMintAuthorityAddress =
    findWrappedMintAuthorityPDA(wrappedMintAddress)[0];
  const unwrappedTokenAccountAddress = getTokenAccount(
    owner,
    unwrappedMint,
    unwrappedTokenAccount,
    false,
    unwrappedTokenProgramId
  );
  const recipientWrappedTokenAccountAddress = getTokenAccount(
    owner,
    wrappedMintAddress,
    undefined,
    false,
    wrappedTokenProgramId
  );
  const unwrappedEscrowAddress = getAssociatedTokenAddressSync(
    unwrappedMint,
    wrappedMintAuthorityAddress,
    true,
    unwrappedTokenProgramId
  );
  const prepareWrappedTokenAccount = await prepareAssociatedTokenAccounts(
    storeProgram,
    owner,
    owner,
    [wrappedMintAddress],
    wrappedTokenProgramId
  );
  return [
    ...prepareWrappedTokenAccount,
    wrap(
      {
        recipientWrappedTokenAccountAddress,
        wrappedMintAddress,
        wrappedMintAuthorityAddress,
        unwrappedTokenProgramId,
        wrappedTokenProgramId,
        unwrappedTokenAccountAddress,
        unwrappedMintAddress: unwrappedMint,
        unwrappedEscrowAddress,
        transferAuthorityAddress: owner,
      },
      {
        amount: toBN(amount),
      }
    ),
  ];
};

export const invokeWrapPayerAsSigner = makeInvoke(makeWrapInstruction, [
  'owner',
]);

export const invokeWrap = makeInvoke(makeWrapInstruction, [], true);
