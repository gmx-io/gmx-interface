import { Keypair, PublicKey } from '@solana/web3.js';
import { toBN } from '../../utils/number';
import { findDepositPDA, findMarketPDA } from '../../store';
import { IxWithOutput, makeInvoke } from '../../utils/invoke';
import { StoreProgram } from '../../program';
import { BN } from '@coral-xyz/anchor';

import {
  getShouldWrapNativeTokenAmount,
  getTokenAccount,
  getTokenEscrow,
  prepareAssociatedTokenAccounts,
  wrapNativeToken,
} from './utils';

const MIN_DEPOSIT_EXECUTION_LAMPORTS = toBN(200000);

export type MakeCreateDepositParams = {
  store: PublicKey;
  owner: PublicKey;
  marketToken: PublicKey;
  initialLongToken: PublicKey;
  initialShortToken: PublicKey;
  initialLongTokenAmount?: number | bigint | BN;
  initialShortTokenAmount?: number | bigint | BN;
  options?: {
    nonce?: Buffer;
    extraExecutionFee?: number | bigint;
    primarySwapPath?: PublicKey[];
    shortTokenSwapPath?: PublicKey[];
    minMarketToken?: number | bigint;
    fromInitialLongTokenAccount?: PublicKey;
    fromInitialShortTokenAccount?: PublicKey;
    skipNativeTokenUnwrap?: boolean;
    shouldWrapNativeTokenForLong?: boolean;
    shouldWrapNativeTokenForShort?: boolean;
  };
};

export const makeCreateDepositInstruction = async (
  program: StoreProgram,
  {
    store,
    owner,
    marketToken,
    initialLongToken,
    initialShortToken,
    initialLongTokenAmount,
    initialShortTokenAmount,
    options,
  }: MakeCreateDepositParams
) => {
  const initialLongTokenAmountBN = toBN(initialLongTokenAmount ?? 0);
  const initialShortTokenAmountBN = toBN(initialShortTokenAmount ?? 0);
  const market = findMarketPDA(store, marketToken)[0];
  const depositNonce =
    options?.nonce ?? Keypair.generate().publicKey.toBuffer();
  const [deposit] = findDepositPDA(store, owner, depositNonce);
  const fromInitialLongTokenAccount = initialLongTokenAmountBN.isZero()
    ? null
    : getTokenAccount(
        owner,
        initialLongToken,
        options?.fromInitialLongTokenAccount,
        options?.shouldWrapNativeTokenForLong
      );
  const fromInitialShortTokenAccount = initialShortTokenAmountBN.isZero()
    ? null
    : getTokenAccount(
        owner,
        initialShortToken,
        options?.fromInitialShortTokenAccount,
        options?.shouldWrapNativeTokenForShort
      );
  const initialLongTokenEscrow = getTokenEscrow(deposit, initialLongToken);
  const initialShortTokenEscrow = getTokenEscrow(deposit, initialShortToken);
  const marketTokenEscrow = getTokenEscrow(deposit, marketToken);
  const longSwapPath = options?.primarySwapPath ?? [];
  const shortSwapPath = options?.shortTokenSwapPath ?? [];
  const skipNativeTokenUnwrap = options?.skipNativeTokenUnwrap ?? false;
  const receiver = owner;
  let instruction = await program.methods
    .createDeposit([...depositNonce], {
      executionLamports: toBN(options?.extraExecutionFee ?? 0).add(
        MIN_DEPOSIT_EXECUTION_LAMPORTS
      ),
      longTokenSwapLength: longSwapPath.length,
      shortTokenSwapLength: shortSwapPath.length,
      initialLongTokenAmount: initialLongTokenAmountBN,
      initialShortTokenAmount: initialShortTokenAmountBN,
      minMarketTokenAmount: toBN(options?.minMarketToken ?? 0),
      shouldUnwrapNativeToken: !skipNativeTokenUnwrap,
    })
    .accountsPartial({
      owner,
      receiver,
      store,
      market,
      deposit,
      marketToken,
      initialLongToken,
      initialShortToken,
      initialLongTokenSource: fromInitialLongTokenAccount,
      initialShortTokenSource: fromInitialShortTokenAccount,
      initialLongTokenEscrow,
      initialShortTokenEscrow,
      marketTokenEscrow,
    })
    .remainingAccounts(
      [...longSwapPath, ...shortSwapPath].map((mint) => {
        return {
          pubkey: findMarketPDA(store, mint)[0],
          isSigner: false,
          isWritable: true,
        };
      })
    )
    .instruction();

  const lamportsForLong = getShouldWrapNativeTokenAmount(
    [initialLongToken],
    [initialLongTokenAmountBN],
    options?.shouldWrapNativeTokenForLong
  );
  const lamportsForShort = getShouldWrapNativeTokenAmount(
    [initialShortToken],
    [initialShortTokenAmountBN],
    options?.shouldWrapNativeTokenForShort
  );
  const wrap = await wrapNativeToken(
    owner,
    lamportsForLong.add(lamportsForShort)
  );

  const prepareOwnerAta = await prepareAssociatedTokenAccounts(
    program,
    owner,
    owner,
    [initialLongToken, initialShortToken]
  );
  const prepare = await prepareAssociatedTokenAccounts(
    program,
    owner,
    deposit,
    [initialLongToken, initialShortToken, marketToken]
  );
  const prepareReceiverAta = await prepareAssociatedTokenAccounts(
    program,
    owner,
    receiver,
    [marketToken]
  );

  return [
    [
      ...prepareOwnerAta,
      ...prepare,
      ...prepareReceiverAta,
      ...wrap,
      instruction,
    ],
    deposit,
  ] as IxWithOutput<PublicKey>;
};

export const invokeCreateDepositWithPayerAsSigner = makeInvoke(
  makeCreateDepositInstruction,
  ['owner']
);
export const invokeCreateDeposit = makeInvoke(
  makeCreateDepositInstruction,
  [],
  true
);
