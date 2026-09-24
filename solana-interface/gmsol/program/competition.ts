import { Program, Provider } from '@coral-xyz/anchor';

import { GmsolCompetition } from '../idl/gmsol_competition';
import GmsolCompetitionIDL from '../idl/gmsol_competition.json';

import { PublicKey } from '@solana/web3.js';

export type CompetitionProgram = Program<GmsolCompetition>;

/**
 * Creates an instance of the Program with the provided IDL schema for the gmsol-competition program.
 *
 * @param provider Optional. The Anchor provider to be used for interacting with the program.
 *                 If no provider is specified, a default provider (if available) will be used.
 * @returns An instance of the Program configured with the gmsol-competition's IDL.
 */
export const makeCompetitionProgram = (provider?: Provider) =>
  new Program(GmsolCompetitionIDL as GmsolCompetition, provider);

export const COMPETITION_PROGRAM_ID: PublicKey = new PublicKey(
  GmsolCompetitionIDL.address
);
