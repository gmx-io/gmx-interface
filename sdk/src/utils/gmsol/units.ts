/**
 * Unit conversions from GMX SDK values to the inputs of the gmsol SDK (`CreateOrderParams`).
 *
 * The units are set by the gmsol program, not by the npm SDK version. `CreateOrderParams` is unchanged from
 * `@gmsol-labs/gmsol-sdk` 0.9.0-test.2 through 0.11.0 (0.11 only adds the optional `nonce`). Recheck this table only
 * when the gmsol program changes its precision.
 *
 * | Quantity                                    | App (GMX SDK)                       | gmsol SDK                          | Conversion                       |
 * | ------------------------------------------- | ----------------------------------- | ---------------------------------- | -------------------------------- |
 * | USD value (`size`, decrease `min_output`)   | USD × 10^30                         | USD × 10^20 (u128)                 | ÷ 10^10, rounding chosen by caller; × 10^10 back (exact) |
 * | Whole-token price (`TokenData.prices`)      | USD × 10^30 per 1 whole token       | —                                  | ÷ 10^(decimals + 10) in one division -> unit price |
 * | Contract price (`convertToContractPrice`)   | USD × 10^30 per smallest unit       | unit price: USD × 10^20 per smallest unit (u128) | ÷ 10^10            |
 * | Token amount (`amount`, increase/swap `min_output`) | smallest units (lamports, mint base units) | smallest units (u64) | identity + u64 range check |
 * | Display multiplier (`Token.visualMultiplier`) | display only                      | never applied                      | not an input of any helper       |
 *
 * `trigger_price` and `acceptable_price` are unit prices. Decimals are the Solana mint's decimals, never the
 * decimals of the Arbitrum token used for oracle prices.
 *
 * Contract: every input is a non-negative `bigint`; decimals is an integer in [0, 30]. Every lossy conversion takes an
 * explicit rounding. A non-zero input that floors to zero is rejected (unrepresentable in gmsol units), as is an
 * output above u128 (USD, prices) or u64 (amounts). Violations throw `RangeError`.
 *
 * Rounding guidance for order builders: round each bound toward the side that is stricter for the user.
 * Acceptable price: "floor" when it is a maximum (long increase, short decrease), "ceil" when it is a minimum
 * (short increase, long decrease). Size: "floor". `convertToContractPrice` always floors, so going through the contract
 * price matches the direct conversion only for "floor"; for "ceil" it can come out one unit lower. Convert a "ceil"
 * bound from the whole-token price with `appTokenPriceToGmsolUnitPrice`, which rounds once.
 */

import { USD_DECIMALS } from "utils/numbers";

export const GMSOL_USD_DECIMALS = 20;
export const MAX_GMSOL_TOKEN_DECIMALS = 30;
export const APP_TO_GMSOL_USD_DIVISOR = 10n ** BigInt(USD_DECIMALS - GMSOL_USD_DECIMALS);
export const U64_MAX = 2n ** 64n - 1n;
export const U128_MAX = 2n ** 128n - 1n;

export type GmsolRounding = "floor" | "ceil";

function assertNonNegativeBigInt(value: bigint, name: string) {
  if (typeof value !== "bigint") {
    throw new RangeError(`gmsol units: ${name} must be a bigint, got ${typeof value}`);
  }

  if (value < 0n) {
    throw new RangeError(`gmsol units: ${name} must be non-negative, got ${value}`);
  }
}

function assertDecimals(decimals: number) {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > MAX_GMSOL_TOKEN_DECIMALS) {
    throw new RangeError(
      `gmsol units: decimals must be an integer in [0, ${MAX_GMSOL_TOKEN_DECIMALS}], got ${decimals}`
    );
  }
}

function assertAtMost(value: bigint, max: bigint, name: string) {
  if (value > max) {
    throw new RangeError(`gmsol units: ${name} ${value} exceeds ${max === U64_MAX ? "u64" : "u128"}`);
  }
}

function divide({
  value,
  divisor,
  rounding,
  name,
}: {
  value: bigint;
  divisor: bigint;
  rounding: GmsolRounding;
  name: string;
}) {
  assertNonNegativeBigInt(value, name);

  if (rounding !== "floor" && rounding !== "ceil") {
    throw new RangeError(`gmsol units: rounding must be "floor" or "ceil", got ${String(rounding)}`);
  }

  const floor = value / divisor;

  if (value !== 0n && floor === 0n) {
    throw new RangeError(`gmsol units: ${name} ${value} is below the smallest gmsol unit (${divisor})`);
  }

  const result = rounding === "ceil" && floor * divisor !== value ? floor + 1n : floor;
  assertAtMost(result, U128_MAX, name);

  return result;
}

/** App USD (10^30) -> gmsol USD (10^20). */
export function appUsdToGmsolUsd(usd: bigint, rounding: GmsolRounding): bigint {
  return divide({ value: usd, divisor: APP_TO_GMSOL_USD_DIVISOR, rounding, name: "usd" });
}

/** gmsol USD (10^20) -> app USD (10^30). Exact. */
export function gmsolUsdToAppUsd(usd: bigint): bigint {
  assertNonNegativeBigInt(usd, "usd");
  assertAtMost(usd, U128_MAX, "usd");

  return usd * APP_TO_GMSOL_USD_DIVISOR;
}

/** App contract price (USD 10^30 per smallest unit) -> gmsol unit price (USD 10^20 per smallest unit). */
export function appContractPriceToGmsolUnitPrice(contractPrice: bigint, rounding: GmsolRounding): bigint {
  return divide({ value: contractPrice, divisor: APP_TO_GMSOL_USD_DIVISOR, rounding, name: "contractPrice" });
}

/** App whole-token price (USD 10^30 per whole token) -> gmsol unit price, rounding once. */
export function appTokenPriceToGmsolUnitPrice({
  price,
  decimals,
  rounding,
}: {
  price: bigint;
  decimals: number;
  rounding: GmsolRounding;
}): bigint {
  assertDecimals(decimals);

  return divide({ value: price, divisor: 10n ** BigInt(decimals) * APP_TO_GMSOL_USD_DIVISOR, rounding, name: "price" });
}

/** gmsol unit price -> app whole-token price (USD 10^30 per whole token). Exact. */
export function gmsolUnitPriceToAppTokenPrice({
  unitPrice,
  decimals,
}: {
  unitPrice: bigint;
  decimals: number;
}): bigint {
  assertDecimals(decimals);
  assertNonNegativeBigInt(unitPrice, "unitPrice");
  assertAtMost(unitPrice, U128_MAX, "unitPrice");

  return unitPrice * 10n ** BigInt(decimals) * APP_TO_GMSOL_USD_DIVISOR;
}

/** Token amount in smallest units, checked to fit gmsol's u64. Never pass a display-scaled value. */
export function toGmsolTokenAmount(amount: bigint): bigint {
  assertNonNegativeBigInt(amount, "amount");
  assertAtMost(amount, U64_MAX, "amount");

  return amount;
}
