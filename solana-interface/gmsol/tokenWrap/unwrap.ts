import { BN } from '@coral-xyz/anchor';
import { StoreProgram } from '../program';
import { unwrap } from '../program/tokenWrap';
import { makeInvoke, toBN } from '../main';
import { PublicKey } from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { findWrappedMintAuthorityPDA, findWrappedMintPDA } from './pda';
import {
  getTokenAccount,
  prepareAssociatedTokenAccounts,
} from '../exchange/instructions/utils';

export type MakeUnwrapParams = {
  amount: number | bigint | BN;
  owner: PublicKey;
  unwrappedMint: PublicKey;
  wrappedTokenAccount?: PublicKey;
  unwrappedTokenProgramId?: PublicKey;
  wrappedTokenProgramId?: PublicKey;
};

export const makeUnwrapInstruction = async (
  storeProgram: StoreProgram,
  {
    amount,
    owner,
    unwrappedMint,
    wrappedTokenAccount,
    unwrappedTokenProgramId: maybeUnwrappedTokenProgramId,
    wrappedTokenProgramId: maybeWrappedTokenProgramId,
  }: MakeUnwrapParams
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
  const unwrappedEscrowAddress = getAssociatedTokenAddressSync(
    unwrappedMint,
    wrappedMintAuthorityAddress,
    true,
    unwrappedTokenProgramId
  );
  const wrappedTokenAccountAddress = getTokenAccount(
    owner,
    wrappedMintAddress,
    wrappedTokenAccount,
    false,
    wrappedTokenProgramId
  );
  const recipientUnwrappedTokenAccountAddress = getTokenAccount(
    owner,
    unwrappedMint,
    undefined,
    false,
    unwrappedTokenProgramId
  );
  const prepareUnwrappedTokenAcount = await prepareAssociatedTokenAccounts(
    storeProgram,
    owner,
    owner,
    [unwrappedMint],
    unwrappedTokenProgramId
  );
  return [
    ...prepareUnwrappedTokenAcount,
    unwrap(
      {
        unwrappedEscrowAddress,
        recipientUnwrappedTokenAccountAddress,
        wrappedMintAuthorityAddress,
        unwrappedMintAddress: unwrappedMint,
        wrappedTokenProgramId,
        unwrappedTokenProgramId,
        wrappedTokenAccountAddress,
        wrappedMintAddress,
        transferAuthorityAddress: owner,
      },
      {
        amount: toBN(amount),
      }
    ),
  ];
};

export const invokeUnwrapPayerAsSigner = makeInvoke(makeUnwrapInstruction, [
  'owner',
]);

export const invokeUnwrap = makeInvoke(makeUnwrapInstruction, [], true);
