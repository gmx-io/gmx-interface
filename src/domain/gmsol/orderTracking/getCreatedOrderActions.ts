import { GMSOL_STORE_ADDRESS, GMSOL_STORE_PROGRAM_ID } from "config/gmsol/program";

import { decodeOrderEvents, type OrderEventFields } from "./decodeOrderEvents";
import type { TrackedOrderAction } from "./reduceOrderLifecycle";

/** Correlates confirmed creation events with addresses from the validated transaction plan. */
export function getCreatedOrderActions({
  signature,
  slot,
  receipt,
  owner,
  orderAddresses,
}: {
  signature: string;
  slot: bigint;
  receipt: unknown;
  owner: string;
  orderAddresses: readonly string[];
}): TrackedOrderAction[] {
  const decoded = decodeOrderEvents({ network: "solana-mainnet", signature, slot, receipt });
  if (decoded.status !== "decoded") throw new Error("Order creation evidence is unavailable");
  const expected = new Set(orderAddresses);
  if (expected.size === 0 || expected.size !== orderAddresses.length)
    throw new Error("Invalid expected order addresses");
  const actions: TrackedOrderAction[] = [];
  for (const { name, fields } of decoded.events) {
    if (name !== "OrderUpdated" || fields.is_create !== true || !expected.has(fields.order as string)) continue;
    const params = fields.params as OrderEventFields;
    if (
      fields.store !== GMSOL_STORE_ADDRESS ||
      fields.owner !== owner ||
      typeof fields.id !== "bigint" ||
      typeof fields.order !== "string" ||
      typeof fields.market_token !== "string" ||
      typeof params.kind !== "string" ||
      (params.position !== null && typeof params.position !== "string") ||
      actions.some((action) => action.order === fields.order)
    ) {
      throw new Error("Order creation evidence does not match the transaction");
    }
    actions.push({
      network: "solana-mainnet",
      program: GMSOL_STORE_PROGRAM_ID,
      store: GMSOL_STORE_ADDRESS,
      order: fields.order,
      actionId: fields.id,
      owner,
      market: fields.market_token,
      position: params.position as string | null,
      kind: params.kind,
      creationSignature: signature,
    });
  }
  if (actions.length !== expected.size) throw new Error("Order creation events are incomplete");
  return actions;
}
