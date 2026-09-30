import { Keypair, PublicKey } from '@solana/web3.js';
import { toBN } from '../../utils/number';
import { findGlvDepositPDA, findGlvPDA, findMarketPDA } from '../../store';
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
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

const MIN_GLV_DEPOSIT_EXECUTION_LAMPORTS = toBN(200000);

export type MakeCreateGlvDepositParams = {
  store: PublicKey;
  owner: PublicKey;
  glvToken: PublicKey;
  marketToken: PublicKey;
  initialLongToken: PublicKey;
  initialShortToken: PublicKey;
  marketTokenAmount?: number | bigint | BN;
  initialLongTokenAmount?: number | bigint | BN;
  initialShortTokenAmount?: number | bigint | BN;
  options?: {
    nonce?: Buffer;
    extraExecutionFee?: number | bigint | BN;
    primarySwapPath?: PublicKey[];
    shortTokenSwapPath?: PublicKey[];
    minMarketToken?: number | bigint | BN;
    minGlvTokenAmount?: number | bigint | BN;
    fromMarketTokenAccount?: PublicKey;
    fromInitialLongTokenAccount?: PublicKey;
    fromInitialShortTokenAccount?: PublicKey;
    skipNativeTokenUnwrap?: boolean;
    shouldWrapNativeTokenForLong?: boolean;
    shouldWrapNativeTokenForShort?: boolean;
  };
};

export const makeCreateGlvDepositInstruction = async (
  program: StoreProgram,
  {
    store,
    owner,
    glvToken,
    marketToken,
    initialLongToken,
    initialShortToken,
    marketTokenAmount,
    initialLongTokenAmount,
    initialShortTokenAmount,
    options,
  }: MakeCreateGlvDepositParams
) => {
  const marketTokenAmountBN = toBN(marketTokenAmount ?? 0);
  const initialLongTokenAmountBN = toBN(initialLongTokenAmount ?? 0);
  const initialShortTokenAmountBN = toBN(initialShortTokenAmount ?? 0);

  const glv = findGlvPDA(glvToken)[0];
  const market = findMarketPDA(store, marketToken)[0];

  const nonce = options?.nonce ?? Keypair.generate().publicKey.toBuffer();
  const [glvDeposit] = findGlvDepositPDA(store, owner, nonce);
  const marketTokenSource = marketTokenAmountBN.isZero()
    ? null
    : getTokenAccount(
        owner,
        marketToken,
        options?.fromMarketTokenAccount,
        false
      );
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
  const initialLongTokenEscrow = getTokenEscrow(glvDeposit, initialLongToken);
  const initialShortTokenEscrow = getTokenEscrow(glvDeposit, initialShortToken);
  const marketTokenEscrow = getTokenEscrow(glvDeposit, marketToken);
  const glvTokenEscrow = getTokenEscrow(
    glvDeposit,
    glvToken,
    TOKEN_2022_PROGRAM_ID
  );
  const longSwapPath = options?.primarySwapPath ?? [];
  const shortSwapPath = options?.shortTokenSwapPath ?? [];
  const skipNativeTokenUnwrap = options?.skipNativeTokenUnwrap ?? false;
  const receiver = owner;
  let instruction = await program.methods
    .createGlvDeposit([...nonce], {
      executionLamports: toBN(options?.extraExecutionFee ?? 0).add(
        MIN_GLV_DEPOSIT_EXECUTION_LAMPORTS
      ),
      longTokenSwapLength: longSwapPath.length,
      shortTokenSwapLength: shortSwapPath.length,
      marketTokenAmount: marketTokenAmountBN,
      initialLongTokenAmount: initialLongTokenAmountBN,
      initialShortTokenAmount: initialShortTokenAmountBN,
      minMarketTokenAmount: toBN(options?.minMarketToken ?? 0),
      minGlvTokenAmount: toBN(options?.minGlvTokenAmount ?? 0),
      shouldUnwrapNativeToken: !skipNativeTokenUnwrap,
    })
    .accountsPartial({
      owner,
      receiver,
      store,
      market,
      glv,
      glvDeposit,
      glvToken,
      marketToken,
      initialLongToken,
      initialShortToken,
      initialLongTokenSource: fromInitialLongTokenAccount,
      initialShortTokenSource: fromInitialShortTokenAccount,
      marketTokenSource,
      initialLongTokenEscrow,
      initialShortTokenEscrow,
      marketTokenEscrow,
      glvTokenEscrow,
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
    [initialLongToken, initialShortToken, marketToken]
  );

  const prepareGlvTokenAta = await prepareAssociatedTokenAccounts(
    program,
    owner,
    receiver,
    [glvToken],
    TOKEN_2022_PROGRAM_ID
  );

  const prepare = await prepareAssociatedTokenAccounts(
    program,
    owner,
    glvDeposit,
    [initialLongToken, initialShortToken, marketToken]
  );

  const prepareGlvTokenEscrow = await prepareAssociatedTokenAccounts(
    program,
    owner,
    glvDeposit,
    [glvToken],
    TOKEN_2022_PROGRAM_ID
  );

  return [
    [
      ...prepareOwnerAta,
      ...prepareGlvTokenAta,
      ...prepare,
      ...prepareGlvTokenEscrow,
      ...wrap,
      instruction,
    ],
    glvDeposit,
  ] as IxWithOutput<PublicKey>;
};

export const invokeCreateGlvDepositWithPayerAsSigner = makeInvoke(
  makeCreateGlvDepositInstruction,
  ['owner']
);
export const invokeCreateGlvDeposit = makeInvoke(
  makeCreateGlvDepositInstruction,
  [],
  true
);
