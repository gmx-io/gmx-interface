import { Keypair, PublicKey } from '@solana/web3.js';
import { toBN } from '../../utils/number';
import { findMarketPDA, findWithdrawalPDA } from '../../store';
import { IxWithOutput, makeInvoke } from '../../utils/invoke';
import { StoreProgram } from '../../program';
import { BN } from '@coral-xyz/anchor';

import {
  getTokenAccount,
  getTokenEscrow,
  prepareAssociatedTokenAccounts,
} from './utils';

const MIN_WITHDRAWAL_EXECUTION_LAMPORTS = toBN(200000);

export type MakeCreateWithdrawalParams = {
  store: PublicKey;
  owner: PublicKey;
  marketToken: PublicKey;
  amount: number | bigint | BN;
  finalLongToken: PublicKey;
  finalShortToken: PublicKey;
  options?: {
    nonce?: Buffer;
    extraExecutionFee?: number | bigint;
    minLongTokenAmount?: number | bigint;
    minShortTokenAmount?: number | bigint;
    fromMarketTokenAccount?: PublicKey;
    primarySwapPath?: PublicKey[];
    shortTokenSwapPath?: PublicKey[];
    skipNativeTokenUnwrap?: boolean;
  };
};

export const makeCreateWithdrawalInstruction = async (
  storeProgram: StoreProgram,
  {
    store,
    owner,
    marketToken,
    amount,
    finalLongToken,
    finalShortToken,
    options,
  }: MakeCreateWithdrawalParams
) => {
  // const [authority] = findControllerPDA(store);
  const fromMarketTokenAccount = getTokenAccount(
    owner,
    marketToken,
    options?.fromMarketTokenAccount
  );
  const withdrawalNonce =
    options?.nonce ?? Keypair.generate().publicKey.toBuffer();
  const [withdrawalAddress] = findWithdrawalPDA(store, owner, withdrawalNonce);

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
    .createWithdrawal([...withdrawalNonce], {
      marketTokenAmount: toBN(amount),
      executionLamports: toBN(options?.extraExecutionFee ?? 0).add(
        MIN_WITHDRAWAL_EXECUTION_LAMPORTS
      ),
      minLongTokenAmount: toBN(options?.minLongTokenAmount ?? 0),
      minShortTokenAmount: toBN(options?.minShortTokenAmount ?? 0),
      longTokenSwapPathLength: longSwapPath.length,
      shortTokenSwapPathLength: shortSwapPath.length,
      shouldUnwrapNativeToken: !skipNativeTokenUnwrap,
    })
    .accountsPartial({
      owner,
      receiver,
      store,
      market: findMarketPDA(store, marketToken)[0],
      marketToken,
      finalLongToken,
      finalShortToken,
      withdrawal: withdrawalAddress,
      marketTokenSource: fromMarketTokenAccount,
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

  const prepareOwnerAta = await prepareAssociatedTokenAccounts(
    storeProgram,
    owner,
    owner,
    [marketToken]
  );
  const prepare = await prepareAssociatedTokenAccounts(
    storeProgram,
    owner,
    withdrawalAddress,
    [marketToken, finalLongToken, finalShortToken]
  );
  const prepareReceiverAta = await prepareAssociatedTokenAccounts(
    storeProgram,
    owner,
    receiver,
    [finalLongToken, finalShortToken]
  );

  return [
    [...prepareOwnerAta, ...prepare, ...prepareReceiverAta, instruction],
    withdrawalAddress,
  ] as IxWithOutput<PublicKey>;
};

export const invokeCreateWithdrawalWithPayerAsSigner = makeInvoke(
  makeCreateWithdrawalInstruction,
  ['owner']
);
export const invokeCreateWithdrawal = makeInvoke(
  makeCreateWithdrawalInstruction,
  [],
  true
);
