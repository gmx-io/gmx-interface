import { PublicKey } from '@solana/web3.js';
import { utils } from '@coral-xyz/anchor';
import { TREASURY_PROGRAM_ID } from './program';

export const GT_BANK_SEED = utils.bytes.utf8.encode('gt_bank');

export const findGtBankPDA = (
  treasuryConfig: PublicKey,
  gtExchangeVault: PublicKey
) =>
  PublicKey.findProgramAddressSync(
    [GT_BANK_SEED, treasuryConfig.toBytes(), gtExchangeVault.toBytes()],
    TREASURY_PROGRAM_ID
  );
