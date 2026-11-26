import { TOKEN_ACCOUNT_SIZE } from "lib/solana/balances";

export const GMSOL_EXECUTION_LAMPORTS = 300_000n;
// The validator rejects a higher compute limit or price (in micro-lamports per unit).
export const GMSOL_MAX_COMPUTE_UNITS = 1_400_000n;
export const GMSOL_MAX_COMPUTE_UNIT_PRICE = 1_000_000n;
const SIGNATURE_LAMPORTS = 5_000n;
const MAX_NETWORK_FEE = SIGNATURE_LAMPORTS + (GMSOL_MAX_COMPUTE_UNITS * GMSOL_MAX_COMPUTE_UNIT_PRICE) / 1_000_000n;

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

/** Before a plan exists: every account an increase with TP/SL can create, at the highest fee the validator allows. */
export function getGmsolIncreaseSolCosts({
  orderCount,
  isPureMarket,
  hasPosition,
}: {
  orderCount: number;
  isPureMarket: boolean;
  hasPosition: boolean;
}): GmsolTransactionSolCost[] {
  const preparation = getGmsolPositionPreparationCost(isPureMarket);
  const prepared = hasPosition ? getNoGmsolCreatedAccounts() : { ...preparation.createdAccounts, user: 1 };
  const costs: GmsolTransactionSolCost = {
    networkFee: MAX_NETWORK_FEE,
    keeperLamports: BigInt(orderCount) * GMSOL_EXECUTION_LAMPORTS + (hasPosition ? 0n : preparation.keeperLamports),
    wrapLamports: 0n,
    createdAccounts: {
      // The wallet's pool token accounts, then per order its pay or output escrow and both pool token escrows.
      tokenAccount: (isPureMarket ? 1 : 2) + 3 * orderCount + prepared.tokenAccount,
      user: prepared.user,
      position: prepared.position,
      order: orderCount + prepared.order,
    },
  };
  // TP/SL can move the wallet preparation into a transaction of its own.
  return orderCount > 1
    ? [
        costs,
        {
          networkFee: MAX_NETWORK_FEE,
          keeperLamports: 0n,
          wrapLamports: 0n,
          createdAccounts: getNoGmsolCreatedAccounts(),
        },
      ]
    : [costs];
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
