import { PublicKey, SystemProgram } from '@solana/web3.js';
import {
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { toBigInt } from '../../utils/number';
import { StoreProgram, CompetitionProgram } from '../../program';
import { BN } from '@coral-xyz/anchor';

export const getTokenAccount = (
  owner: PublicKey,
  token: PublicKey,
  account?: PublicKey,
  shouldWrapNativeToken?: boolean,
  tokenProgramId: PublicKey = TOKEN_PROGRAM_ID
) => {
  if (
    shouldWrapNativeToken &&
    account &&
    token.equals(NATIVE_MINT) &&
    !account.equals(getAssociatedTokenAddressSync(token, owner, true))
  ) {
    throw Error('must use native mint ATA when `shouldWrapNativeToken` is set');
  }
  return account
    ? account
    : getAssociatedTokenAddressSync(token, owner, true, tokenProgramId);
};

export const getOptionalATA = (
  owner: PublicKey,
  token: PublicKey | null,
  shouldUnwrapNativeToken: boolean
) => {
  return token
    ? shouldUnwrapNativeToken && token.equals(NATIVE_MINT)
      ? owner
      : getAssociatedTokenAddressSync(token, owner, true)
    : null;
};

export const getTokenEscrow = (
  action: PublicKey,
  token: PublicKey,
  tokenProgramId?: PublicKey
) => {
  return getAssociatedTokenAddressSync(token, action, true, tokenProgramId);
};

export const uniqueTokenMints = (tokens: (PublicKey | null)[]): PublicKey[] => {
  const seen = new Set<string>();
  return tokens.filter((token): token is PublicKey => {
    if (!token) return false;
    const key = token.toBase58();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const ataMintsToPrepare = (
  tokens: (PublicKey | null)[],
  shouldUnwrapNativeToken: boolean
): PublicKey[] =>
  uniqueTokenMints(tokens).filter(
    (token) => !(shouldUnwrapNativeToken && token.equals(NATIVE_MINT))
  );

export const prepareAssociatedTokenAccounts = async (
  program: StoreProgram,
  payer: PublicKey,
  owner: PublicKey,
  tokens: PublicKey[],
  tokenProgram: PublicKey = TOKEN_PROGRAM_ID
) => {
  return await Promise.all(
    uniqueTokenMints(tokens).map((token) => {
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

export const prepareMissingAssociatedTokenAccounts = async (
  program: StoreProgram,
  payer: PublicKey,
  owner: PublicKey,
  tokens: PublicKey[],
  tokenProgram: PublicKey = TOKEN_PROGRAM_ID
) => {
  const unique = uniqueTokenMints(tokens);
  if (unique.length === 0) return [];

  const addresses = unique.map((token) =>
    getAssociatedTokenAddressSync(token, owner, true, tokenProgram)
  );
  const infos = await program.provider.connection.getMultipleAccountsInfo(
    addresses
  );
  const missing = unique.filter((_, index) => !infos[index]);

  return prepareAssociatedTokenAccounts(
    program,
    payer,
    owner,
    missing,
    tokenProgram
  );
};

export const prepareUser = async (
  program: StoreProgram,
  store: PublicKey,
  owner: PublicKey
) => {
  return program.methods
    .prepareUser()
    .accountsPartial({
      store,
      owner,
    })
    .instruction();
};

// @ts-ignore
export type CreateOrderParams = Parameters<
  StoreProgram['methods']['preparePosition']
>[0];

export const preparePosition = async (
  program: StoreProgram,
  store: PublicKey,
  owner: PublicKey,
  market: PublicKey,
  position: PublicKey,
  params: CreateOrderParams
) => {
  return program.methods
    .preparePosition(params)
    .accountsPartial({
      owner,
      store,
      position,
      market,
    })
    .instruction();
};

export const wrapNativeToken = async (owner: PublicKey, lamports: BN) => {
  if (lamports.isZero()) return [];

  console.debug('wrapping native tokens', lamports.toString());
  const account = getAssociatedTokenAddressSync(NATIVE_MINT, owner, true);
  const transfer = SystemProgram.transfer({
    fromPubkey: owner,
    toPubkey: account,
    lamports: toBigInt(lamports),
  });
  const sync = createSyncNativeInstruction(account);

  return [transfer, sync];
};

export const getShouldWrapNativeTokenAmount = (
  tokens: PublicKey[],
  amounts: BN[],
  shouldWrapNativeToken?: boolean
) => {
  if (!shouldWrapNativeToken) return new BN(0);
  if (tokens.length !== amounts.length)
    throw Error(
      'the length of the tokens array does not match the length of the amounts array.'
    );
  return amounts
    .filter((_amount, idx) => tokens[idx].equals(NATIVE_MINT))
    .reduce((acc, amount) => acc.add(amount), new BN(0));
};

export const createParticipantIdempotent = async (
  program: CompetitionProgram,
  owner: PublicKey,
  competitionId: PublicKey,
  participantPda: PublicKey
) => {
  return program.methods
    .createParticipantIdempotent()
    .accountsPartial({
      payer: owner,
      competition: competitionId,
      participant: participantPda,
      trader: owner,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
};
