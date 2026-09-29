/**
 * Slot-protected account cache, same rules as `positions/positionAccountsCache.ts` but generic so the
 * order hook can use it without touching the positions module.
 */
type SlotEntry = { slot: number };

/**
 * Applies an account update with slot protection. Returns false when a newer entry already exists.
 * A `undefined` entry removes any existing entry.
 */
export function applyOrderAccountUpdate<T extends SlotEntry>(
  cache: Map<string, T>,
  pubkey: string,
  slot: number,
  entry: T | undefined
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
 * Removes entries the snapshot no longer contains (executed / cancelled orders close their account),
 * unless a subscription update newer than the snapshot slot already replaced them.
 */
export function reconcileOrderSnapshot<T extends SlotEntry>(
  cache: Map<string, T>,
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
