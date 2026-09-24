import { Program, Provider } from '@coral-xyz/anchor';

import { GmsolStore } from '../idl/gmsol_store';
import GmsolStoreIDL from '../idl/gmsol_store.json';

import { PublicKey } from '@solana/web3.js';

export type StoreProgram = Program<GmsolStore>;

/**
 * Creates an instance of the Program with the provided IDL schema for the gmsol-store program.
 *
 * @param provider Optional. The Anchor provider to be used for interacting with the program.
 *                 If no provider is specified, a default provider (if available) will be used.
 * @returns An instance of the Program configured with the gmsol-store's IDL.
 */
export const makeStoreProgram = (provider?: Provider) =>
  new Program(GmsolStoreIDL as GmsolStore, provider);

export const STORE_PROGRAM_ID: PublicKey = new PublicKey(GmsolStoreIDL.address);
