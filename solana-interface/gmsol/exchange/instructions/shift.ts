import { Keypair, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { toBN } from '../../utils/number';
import { findMarketPDA, findShiftPDA } from '../../store';
import { IxWithOutput, makeInvoke } from '../../utils/invoke';
import { StoreProgram } from '../../program';
import { BN } from '@coral-xyz/anchor';

import {
  getTokenAccount,
  getTokenEscrow,
  prepareAssociatedTokenAccounts,
} from './utils';

const MIN_SHIFT_EXECUTION_LAMPORTS = toBN(200000);

export type MakeCreateShiftParams = {
  store: PublicKey;
  owner: PublicKey;
  fromMarketToken: PublicKey;
  toMarketToken: PublicKey;
  amount: number | bigint | BN;
  options?: {
    nonce?: Buffer;
    extraExecutionFee?: number | bigint;
    minToMarketToken?: number | bigint;
    fromMarketTokenAccount?: PublicKey;
  };
};

export const makeCreateShiftInstruction = async (
  program: StoreProgram,
  {
    store,
    owner,
    fromMarketToken,
    toMarketToken,
    amount,
    options,
  }: MakeCreateShiftParams
) => {
  const amountBN = toBN(amount ?? 0);
  const [fromMarket] = findMarketPDA(store, fromMarketToken);
  const [toMarket] = findMarketPDA(store, toMarketToken);
  const nonce = options?.nonce ?? Keypair.generate().publicKey.toBuffer();
  const [shift] = findShiftPDA(store, owner, nonce);

  const fromMarketTokenAccount = getTokenAccount(
    owner,
    fromMarketToken,
    options?.fromMarketTokenAccount,
    false
  );
  const fromMarketTokenEscrow = getTokenEscrow(shift, fromMarketToken);
  const toMarketTokenEscrow = getTokenEscrow(shift, toMarketToken);
  const toMarketTokenAta = getAssociatedTokenAddressSync(
    toMarketToken,
    owner,
    true
  );

  const receiver = owner;
  let instruction = await program.methods
    .createShift([...nonce], {
      executionLamports: toBN(options?.extraExecutionFee ?? 0).add(
        MIN_SHIFT_EXECUTION_LAMPORTS
      ),
      fromMarketTokenAmount: amountBN,
      minToMarketTokenAmount: toBN(options?.minToMarketToken ?? 0),
    })
    .accountsPartial({
      owner,
      receiver,
      store,
      fromMarket,
      toMarket,
      shift,
      fromMarketToken,
      toMarketToken,
      fromMarketTokenEscrow,
      toMarketTokenEscrow,
      fromMarketTokenSource: fromMarketTokenAccount,
      toMarketTokenAta,
    })
    .instruction();

  const prepareOwnerAta = await prepareAssociatedTokenAccounts(
    program,
    owner,
    owner,
    [fromMarketToken]
  );

  const prepare = await prepareAssociatedTokenAccounts(program, owner, shift, [
    fromMarketToken,
    toMarketToken,
  ]);

  const prepareReceiverAta = await prepareAssociatedTokenAccounts(
    program,
    owner,
    receiver,
    [toMarketToken]
  );

  return [
    [...prepareOwnerAta, ...prepare, ...prepareReceiverAta, instruction],
    shift,
  ] as IxWithOutput<PublicKey>;
};

export const invokeCreateShiftWithPayerAsSigner = makeInvoke(
  makeCreateShiftInstruction,
  ['owner']
);
export const invokeCreateShift = makeInvoke(
  makeCreateShiftInstruction,
  [],
  true
);
