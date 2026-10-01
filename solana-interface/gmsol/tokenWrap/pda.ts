import { PublicKey } from '@solana/web3.js';
import { DEFAULT_TOKEN_WRAP_PROGRAM_ID } from '../program/tokenWrap';
import { utils } from '@coral-xyz/anchor';

const encodeUtf8 = utils.bytes.utf8.encode;

export const WRAPPED_MINT_SEED = encodeUtf8('mint');
export const WRAPPED_MINT_AUTHORITY_SEED = encodeUtf8('authority');

export const findWrappedMintPDA = (
  unwrappedMint: PublicKey,
  wrappedTokenProgramId: PublicKey,
  programId: PublicKey = DEFAULT_TOKEN_WRAP_PROGRAM_ID
) =>
  PublicKey.findProgramAddressSync(
    [
      WRAPPED_MINT_SEED,
      unwrappedMint.toBytes(),
      wrappedTokenProgramId.toBytes(),
    ],
    programId
  );

export const findWrappedMintAuthorityPDA = (
  wrappedMint: PublicKey,
  programId: PublicKey = DEFAULT_TOKEN_WRAP_PROGRAM_ID
) =>
  PublicKey.findProgramAddressSync(
    [WRAPPED_MINT_AUTHORITY_SEED, wrappedMint.toBytes()],
    programId
  );
