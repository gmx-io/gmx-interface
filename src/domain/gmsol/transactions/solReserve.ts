import { TOKEN_ACCOUNT_SIZE } from "lib/solana/balances";

export const GMSOL_EXECUTION_LAMPORTS = 300_000n;

// Data sizes at the pinned store commit, discriminator included; the wallet itself must stay rent exempt.
export const GMSOL_RENT_ACCOUNT_SIZES = {
  wallet: 0,
  tokenAccount: TOKEN_ACCOUNT_SIZE,
  user: 520,
  position: 680,
  order: 2472,
} as const;

export type GmsolRentAccount = keyof typeof GMSOL_RENT_ACCOUNT_SIZES;
export type GmsolRentExemptMinimums = Record<GmsolRentAccount, bigint>;
export type GmsolCreatedAccounts = Record<Exclude<GmsolRentAccount, "wallet">, number>;

export type GmsolTransactionSolCost = {
  networkFee: bigint;
  keeperLamports: bigint;
  wrapLamports: bigint;
  // An upper bound: idempotent preparation funds an account only when it is missing.
  createdAccounts: GmsolCreatedAccounts;
};

export function getNoGmsolCreatedAccounts(): GmsolCreatedAccounts {
  return { tokenAccount: 0, user: 0, position: 0, order: 0 };
}

// A new position also prefunds its position-cut order: the order, its escrows and its keeper fee (Order::position_cut_rent).
export function getGmsolPositionPreparationCost(isPureMarket: boolean) {
  return {
    keeperLamports: GMSOL_EXECUTION_LAMPORTS,
    createdAccounts: { tokenAccount: isPureMarket ? 1 : 2, user: 0, position: 1, order: 1 },
  };
}

export function getGmsolSolReserve(costs: readonly GmsolTransactionSolCost[], rent: GmsolRentExemptMinimums) {
  let reserve = rent.wallet;
  for (const { networkFee, keeperLamports, wrapLamports, createdAccounts } of costs) {
    reserve += networkFee + keeperLamports + wrapLamports;
    for (const account of Object.keys(createdAccounts) as (keyof GmsolCreatedAccounts)[]) {
      reserve += BigInt(createdAccounts[account]) * rent[account];
    }
  }
  return reserve;
}
