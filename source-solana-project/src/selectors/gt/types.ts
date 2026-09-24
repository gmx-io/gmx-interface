import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { t } from '@lingui/macro';

export const BATCH_NAMES: { [key: number]: string } = {
  0: t`Novice`,
  1: t`Herald`,
  2: t`Guardian`,
  3: t`Crusader`,
  4: t`Archon`,
  5: t`Legend`,
  6: t`Ancient`,
  7: t`Divine`,
  8: t`Immortal`,
  9: t`Celestial`,
};

export interface TokenBalance {
  amount: BN;
  receiverVaultOut?: BN;
}

export interface TokenBalanceWithAddress {
  key: string;
  value: TokenBalance;
}

export interface TokenBalances {
  count: number;
  data: TokenBalanceWithAddress[];
}

export interface GtBankFlagsContainer {
  value: number;
}

export interface GtBank {
  // Bump seed
  bump: number;
  // Flags container
  flags: GtBankFlagsContainer;
  // Padding bytes
  padding: number[];
  // Treasury vault config account
  treasuryVaultConfig: PublicKey;
  // GT exchange vault account
  gtExchangeVault: PublicKey;
  // Remaining confirmed GT amount
  remainingConfirmedGtAmount: BN;
  // Token balances mapping
  balances: TokenBalances;
  // Config account
  buybackFactor: BN;
}

export interface GtBanks {
  [address: string]: GtBank;
}

export interface GtExchangeVaultFlagsContainer {
  value: number;
}

export interface GtExchangeVault {
  // Bump seed
  bump: number;
  // Flags container
  flags: GtExchangeVaultFlagsContainer;
  // Padding bytes
  padding: number[];
  // Timestamp
  ts: BN;
  // Time window
  timeWindow: BN;
  // GT amount
  amount: BN;
  // Store account
  store: PublicKey;
}

export interface GtExchangeVaults {
  [address: string]: GtExchangeVault;
}

export type GtGlobalDetails = {
  // GT token decimals
  decimals: number;
  // Last minted timestamp
  lastMintedAt: BN;
  // Growth step amount for minting cost
  growStepAmount: BN;
  // Current grow steps count
  growSteps: BN;
  // Total GT supply
  supply: BN;
  // Total minted GT amount
  totalMintedAmount: BN;
  // Minting cost growth factor
  mintingCostGrowFactor: BN;
  // Current minting cost
  mintingCost: BN;
  // Maximum rank
  maxRank: BN;
  // Array of GT thresholds for each rank
  ranks: BN[];
  // Array of order fee discount factors for each rank
  orderFeeDiscountFactors: BN[];
  // Array of referral reward factors for each rank
  referralRewardFactors: BN[];
  // Reserve factor
  reserveFactor: BN;
  // Exchange time window
  exchangeTimeWindow: number;
  // Referral discount factor
  referralDiscountFactor: BN;
  // GT vault amount
  gtVaultAmount: BN;
};

export type GtUserDetails = {
  // User level
  rank: number;
  // Last minting time
  lastMintedAt: BN;
  // Total minted amount
  totalMinted: BN;
  // GT amount
  amount: BN;
  // Paid fee value
  paidFeeValue: BN;
  // Minted fee value
  mintedFeeValue: BN;
};

export interface GtExchangeAccount {
  amount: BN;
  owner: PublicKey;
  store: PublicKey;
  vault: PublicKey;
}

export interface GtExchangeAccounts {
  [address: string]: GtExchangeAccount;
}
