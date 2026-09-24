import { Program, Provider } from '@coral-xyz/anchor';

import { GmsolTimelock } from '../idl/gmsol_timelock';
import GmsolTimelockIDL from '../idl/gmsol_timelock.json';

import { PublicKey } from '@solana/web3.js';

export type timelockProgram = Program<GmsolTimelock>;

/**
 * Creates an instance of the Program with the provided IDL schema for the gmsol-timelock program.
 *
 * @param provider Optional. The Anchor provider to be used for interacting with the program.
 *                 If no provider is specified, a default provider (if available) will be used.
 * @returns An instance of the Program configured with the gmsol-timelock's IDL.
 */
export const makeTimelockProgram = (provider?: Provider) =>
  new Program(GmsolTimelockIDL as GmsolTimelock, provider);

export const TIMELOCK_PROGRAM_ID: PublicKey = new PublicKey(
  GmsolTimelockIDL.address
);
