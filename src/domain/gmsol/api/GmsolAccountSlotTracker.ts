import { commitGmsolSnapshot } from "./refetchAtSlot";

type AccountSlots = { acceptedSlot?: number; requiredSlot?: number };

export class GmsolAccountSlotTracker {
  slots = new Map<string, AccountSlots>();
  listeners = new Set<() => void>();

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notify() {
    this.listeners.forEach((listener) => listener());
  }

  getMinContextSlot(key: string) {
    const state = this.slots.get(key);
    if (state?.acceptedSlot === undefined) return state?.requiredSlot;
    return Math.max(state.acceptedSlot, state.requiredSlot ?? 0);
  }

  isPending(key: string | undefined) {
    const state = key ? this.slots.get(key) : undefined;
    return state?.requiredSlot !== undefined && (state.acceptedSlot ?? -1) < state.requiredSlot;
  }

  requireSlot(key: string, slot: number) {
    const state = this.slots.get(key);
    if (state?.requiredSlot !== undefined && state.requiredSlot >= slot) return;
    this.slots.set(key, { ...state, requiredSlot: slot });
    this.notify();
  }

  takeSnapshot<T>(key: string, responseSlot: number | undefined, response: T): T {
    const state = this.slots.get(key);
    const next = commitGmsolSnapshot({ acceptedSlot: state?.acceptedSlot, responseSlot, response });
    // Check the latest floor when a read settles: a newer confirmation may have arrived in flight.
    if (state?.requiredSlot !== undefined && next.slot < state.requiredSlot) {
      throw new Error("Solana response slot is older than the confirmed transaction");
    }
    this.slots.set(key, { ...state, acceptedSlot: next.slot });
    this.notify();
    return next.data;
  }
}
