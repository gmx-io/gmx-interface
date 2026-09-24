import { Program, Provider } from '@coral-xyz/anchor';

import { GmsolTreasury } from '../idl/gmsol_treasury';
import GmsolTreasuryIDL from '../idl/gmsol_treasury.json';

import { PublicKey } from '@solana/web3.js';

export type TreasuryPorgram = Program<GmsolTreasury>;

/**
 * Creates an instance of the Program with the provided IDL schema for the gmsol-treasury program.
 *
 * @param provider Optional. The Anchor provider to be used for interacting with the program.
 *                 If no provider is specified, a default provider (if available) will be used.
 * @returns An instance of the Program configured with the gmsol-treasury's IDL.
 */
export const makeTreasuryProgram = (provider?: Provider) =>
  new Program(GmsolTreasuryIDL as GmsolTreasury, provider);

export const TREASURY_PROGRAM_ID: PublicKey = new PublicKey(
  GmsolTreasuryIDL.address
);
