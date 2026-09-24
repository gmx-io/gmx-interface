import { Keypair, PublicKey } from '@solana/web3.js';
import { toBN } from '../../utils/number';
import { findGlvPDA, findMarketPDA, findGlvWithdrawalPDA } from '../../store';
import { IxWithOutput, makeInvoke } from '../../utils/invoke';
import { StoreProgram } from '../../program';
import { BN } from '@coral-xyz/anchor';

import {
  getTokenAccount,
  getTokenEscrow,
  prepareAssociatedTokenAccounts,
} from './utils';
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

const MIN_GLV_WITHDRAWAL_EXECUTION_LAMPORTS = toBN(200000);

export type MakeCreateGlvWithdrawalParams = {
  store: PublicKey;
  owner: PublicKey;
  glvToken: PublicKey;
  marketToken: PublicKey;
  amount: number | bigint | BN;
  finalLongToken: PublicKey;
  finalShortToken: PublicKey;
  options?: {
    nonce?: Buffer;
    extraExecutionFee?: number | bigint;
    minLongTokenAmount?: number | bigint;
    minShortTokenAmount?: number | bigint;
    glvTokenSource?: PublicKey;
    primarySwapPath?: PublicKey[];
    shortTokenSwapPath?: PublicKey[];
    skipNativeTokenUnwrap?: boolean;
  };
};

export const makeCreateGlvWithdrawalInstruction = async (
  storeProgram: StoreProgram,
  {
    store,
    owner,
    glvToken,
    marketToken,
    amount,
    finalLongToken,
    finalShortToken,
    options,
  }: MakeCreateGlvWithdrawalParams
) => {
  const glvTokenSource = getTokenAccount(
    owner,
    glvToken,
    options?.glvTokenSource,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  const nonce = options?.nonce ?? Keypair.generate().publicKey.toBuffer();
  const [withdrawalAddress] = findGlvWithdrawalPDA(store, owner, nonce);

  const glvTokenEscrow = getTokenEscrow(
    withdrawalAddress,
    glvToken,
    TOKEN_2022_PROGRAM_ID
  );
  const marketTokenEscrow = getTokenEscrow(withdrawalAddress, marketToken);
  const finalLongTokenEscrow = getTokenEscrow(
    withdrawalAddress,
    finalLongToken
  );
  const finalShortTokenEscrow = getTokenEscrow(
    withdrawalAddress,
    finalShortToken
  );

  const longSwapPath = options?.primarySwapPath ?? [];
  const shortSwapPath = options?.shortTokenSwapPath ?? [];
  const skipNativeTokenUnwrap = options?.skipNativeTokenUnwrap ?? false;
  const receiver = owner;
  const instruction = await storeProgram.methods
    .createGlvWithdrawal([...nonce], {
      glvTokenAmount: toBN(amount),
      executionLamports: toBN(options?.extraExecutionFee ?? 0).add(
        MIN_GLV_WITHDRAWAL_EXECUTION_LAMPORTS
      ),
      minFinalLongTokenAmount: toBN(options?.minLongTokenAmount ?? 0),
      minFinalShortTokenAmount: toBN(options?.minShortTokenAmount ?? 0),
      longTokenSwapLength: longSwapPath.length,
      shortTokenSwapLength: shortSwapPath.length,
      shouldUnwrapNativeToken: !skipNativeTokenUnwrap,
    })
    .accountsPartial({
      owner,
      receiver,
      store,
      market: findMarketPDA(store, marketToken)[0],
      glv: findGlvPDA(glvToken)[0],
      glvWithdrawal: withdrawalAddress,
      glvToken,
      marketToken,
      finalLongToken,
      finalShortToken,
      glvTokenSource,
      glvTokenEscrow,
      marketTokenEscrow,
      finalLongTokenEscrow,
      finalShortTokenEscrow,
    })
    .remainingAccounts(
      [...longSwapPath, ...shortSwapPath].map((token) => {
        return {
          pubkey: findMarketPDA(store, token)[0],
          isSigner: false,
          isWritable: false,
        };
      })
    )
    .instruction();

  const prepareGlvTokenAta = await prepareAssociatedTokenAccounts(
    storeProgram,
    owner,
    owner,
    [glvToken],
    TOKEN_2022_PROGRAM_ID
  );

  const prepareOwnerAta = await prepareAssociatedTokenAccounts(
    storeProgram,
    owner,
    owner,
    [marketToken]
  );

  const prepareReceiverAta = await prepareAssociatedTokenAccounts(
    storeProgram,
    owner,
    receiver,
    [finalLongToken, finalShortToken]
  );

  const prepare = await prepareAssociatedTokenAccounts(
    storeProgram,
    owner,
    withdrawalAddress,
    [marketToken, finalLongToken, finalShortToken]
  );

  const prepareGlvTokenEscrow = await prepareAssociatedTokenAccounts(
    storeProgram,
    owner,
    withdrawalAddress,
    [glvToken],
    TOKEN_2022_PROGRAM_ID
  );

  return [
    [
      ...prepareGlvTokenAta,
      ...prepareOwnerAta,
      ...prepareReceiverAta,
      ...prepare,
      ...prepareGlvTokenEscrow,
      instruction,
    ],
    withdrawalAddress,
  ] as IxWithOutput<PublicKey>;
};

export const invokeCreateGlvWithdrawalWithPayerAsSigner = makeInvoke(
  makeCreateGlvWithdrawalInstruction,
  ['owner']
);
export const invokeCreateGlvWithdrawal = makeInvoke(
  makeCreateGlvWithdrawalInstruction,
  [],
  true
);
