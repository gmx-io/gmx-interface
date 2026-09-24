import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { TokenData } from '../token/types';
import { Token } from '../token/types';

export enum Operation {
  Deposit = 'Deposit',
  Withdrawal = 'Withdrawal',
  Shift = 'Shift',
}

export enum Mode {
  Single = 'Single',
  Pair = 'Pair',
}

export interface TokenOptions {
  tokenOptions: Token[];
  firstToken?: TokenData;
  secondToken?: TokenData;
}

export interface CreateDepositParams {
  marketToken: PublicKey;
  initialLongToken: PublicKey;
  initialShortToken: PublicKey;
  initialLongTokenAmount: BN;
  initialShortTokenAmount: BN;
  skipPreflight: boolean;
}

export interface CreateWithdrawalParams {
  marketToken: PublicKey;
  amount: BN;
  finalLongToken: PublicKey;
  finalShortToken: PublicKey;
  skipPreflight: boolean;
}
