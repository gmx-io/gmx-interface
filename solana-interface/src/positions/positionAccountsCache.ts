import type { RawSolanaPosition } from "./types";

/**
 * Applies an account update with slot protection. Returns false when a newer entry already exists.
 * A `undefined` entry (non Long/Short kind) removes any existing entry.
 */
export function applyAccountUpdate(
  cache: Map<string, RawSolanaPosition>,
  pubkey: string,
  slot: number,
  entry: RawSolanaPosition | undefined
): boolean {
  const existing = cache.get(pubkey);
  if (existing && existing.slot > slot) return false;
  if (!entry) {
    if (!existing) return false;
    cache.delete(pubkey);
    return true;
  }
  cache.set(pubkey, entry);
  return true;
}

/**
 * Removes entries that the snapshot no longer contains, unless a subscription update newer than the
 * snapshot slot already replaced them. Returns true when anything was removed.
 */
export function reconcileSnapshot(
  cache: Map<string, RawSolanaPosition>,
  seen: ReadonlySet<string>,
  snapshotSlot: number
): boolean {
  let changed = false;
  for (const [pubkey, existing] of [...cache]) {
    if (seen.has(pubkey)) continue;
    if (existing.slot > snapshotSlot) continue;
    cache.delete(pubkey);
    changed = true;
  }
  return changed;
}

/** Open positions only: closed positions keep their account with `sizeInUsd === 0`. */
export function selectOpenPositions(cache: ReadonlyMap<string, RawSolanaPosition>): RawSolanaPosition[] {
  return [...cache.values()].filter((position) => position.sizeInUsd > 0n);
}
