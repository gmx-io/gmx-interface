import { BN } from '@coral-xyz/anchor';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';

/**
 * The default token-wrap program ID.
 */
export const DEFAULT_TOKEN_WRAP_PROGRAM_ID: PublicKey = new PublicKey(
  '12cJKgP9r2bcaruqu3XsCS1hxLqsHrmZhqG5Qy2TWRap'
);

/**
 * Account list for `Wrap` instruction.
 */
export interface WrapAccounts {
  recipientWrappedTokenAccountAddress: PublicKey;
  wrappedMintAddress: PublicKey;
  wrappedMintAuthorityAddress: PublicKey;
  unwrappedTokenProgramId: PublicKey;
  wrappedTokenProgramId: PublicKey;
  unwrappedTokenAccountAddress: PublicKey;
  unwrappedMintAddress: PublicKey;
  unwrappedEscrowAddress: PublicKey;
  transferAuthorityAddress: PublicKey;
  multisigSignerPubkeys?: PublicKey[];
}

/**
 * Arguments for `Wrap` instruction.
 */
export interface WrapArgs {
  amount: BN;
}

/**
 * Creates `Wrap` instruction.
 */
export function wrap(
  accounts: WrapAccounts,
  args: WrapArgs,
  programId: PublicKey = DEFAULT_TOKEN_WRAP_PROGRAM_ID
): TransactionInstruction {
  const discriminator = Buffer.alloc(1);
  discriminator.writeUInt8(1, 0);
  const amount = args.amount.toBuffer('le', 8);

  const multisigSignerPubkeys = accounts.multisigSignerPubkeys ?? [];

  return new TransactionInstruction({
    data: Buffer.concat([discriminator, amount]),
    keys: [
      {
        pubkey: accounts.recipientWrappedTokenAccountAddress,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: accounts.wrappedMintAddress,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: accounts.wrappedMintAuthorityAddress,
        isWritable: false,
        isSigner: false,
      },
      {
        pubkey: accounts.unwrappedTokenProgramId,
        isWritable: false,
        isSigner: false,
      },
      {
        pubkey: accounts.wrappedTokenProgramId,
        isWritable: false,
        isSigner: false,
      },
      {
        pubkey: accounts.unwrappedTokenAccountAddress,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: accounts.unwrappedMintAddress,
        isWritable: false,
        isSigner: false,
      },
      {
        pubkey: accounts.unwrappedEscrowAddress,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: accounts.transferAuthorityAddress,
        isWritable: false,
        isSigner: multisigSignerPubkeys.length === 0,
      },
      ...multisigSignerPubkeys.map((pubkey) => ({
        pubkey,
        isWritable: false,
        isSigner: true,
      })),
    ],
    programId,
  });
}

/**
 * Account list for `Unwrap` instruction.
 */
export interface UnwrapAccounts {
  unwrappedEscrowAddress: PublicKey;
  recipientUnwrappedTokenAccountAddress: PublicKey;
  wrappedMintAuthorityAddress: PublicKey;
  unwrappedMintAddress: PublicKey;
  wrappedTokenProgramId: PublicKey;
  unwrappedTokenProgramId: PublicKey;
  wrappedTokenAccountAddress: PublicKey;
  wrappedMintAddress: PublicKey;
  transferAuthorityAddress: PublicKey;
  multisigSignerPubkeys?: PublicKey[];
}

/**
 * Arguments for `Unwrap` instruction.
 */
export interface UnwrapArgs {
  amount: BN;
}

/**
 * Creates `Unwrap` instruction.
 */
export function unwrap(
  accounts: UnwrapAccounts,
  args: UnwrapArgs,
  programId: PublicKey = DEFAULT_TOKEN_WRAP_PROGRAM_ID
): TransactionInstruction {
  const discriminator = Buffer.alloc(1);
  discriminator.writeUInt8(2, 0);
  const amount = args.amount.toBuffer('le', 8);

  const multisigSignerPubkeys = accounts.multisigSignerPubkeys ?? [];

  return new TransactionInstruction({
    data: Buffer.concat([discriminator, amount]),
    keys: [
      {
        pubkey: accounts.unwrappedEscrowAddress,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: accounts.recipientUnwrappedTokenAccountAddress,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: accounts.wrappedMintAuthorityAddress,
        isWritable: false,
        isSigner: false,
      },
      {
        pubkey: accounts.unwrappedMintAddress,
        isWritable: false,
        isSigner: false,
      },
      {
        pubkey: accounts.wrappedTokenProgramId,
        isWritable: false,
        isSigner: false,
      },
      {
        pubkey: accounts.unwrappedTokenProgramId,
        isWritable: false,
        isSigner: false,
      },
      {
        pubkey: accounts.wrappedTokenAccountAddress,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: accounts.wrappedMintAddress,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: accounts.transferAuthorityAddress,
        isWritable: false,
        isSigner: multisigSignerPubkeys.length === 0,
      },
      ...multisigSignerPubkeys.map((pubkey) => ({
        pubkey,
        isWritable: false,
        isSigner: true,
      })),
    ],
    programId,
  });
}
