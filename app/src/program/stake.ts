import { Program, Provider } from '@coral-xyz/anchor';

import { GmsolStake } from '../idl/gmsol_stake';
import GmsolStakeIDL from '../idl/gmsol_stake.json';

import { PublicKey } from '@solana/web3.js';

export type StakeProgram = Program<GmsolStake>;

/**
 * Creates an instance of the Program with the provided IDL schema for the gmsol-stake program.
 *
 * @param provider Optional. The Anchor provider to be used for interacting with the program.
 *                 If no provider is specified, a default provider (if available) will be used.
 * @returns An instance of the Program configured with the gmsol-stake's IDL.
 */
export const makeStakeProgram = (provider?: Provider) =>
  new Program(GmsolStakeIDL as GmsolStake, provider);

export const STAKE_PROGRAM_ID: PublicKey = new PublicKey(
  GmsolStakeIDL.address
);
