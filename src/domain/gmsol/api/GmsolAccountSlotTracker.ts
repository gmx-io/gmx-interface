import { commitGmsolSnapshot, type GmsolSlotted } from "./refetchAtSlot";

type AccountSlots = { acceptedSlot?: number; acceptedData?: unknown; requiredSlot?: number; error?: Error };

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

  getError(key: string | undefined) {
    return key ? this.slots.get(key)?.error : undefined;
  }

  fail(key: string, error: unknown) {
    this.slots.set(key, { ...this.slots.get(key), error: error instanceof Error ? error : new Error(String(error)) });
    this.notify();
  }

  requireSlot(key: string, slot: number) {
    const state = this.slots.get(key);
    if (state?.requiredSlot !== undefined && state.requiredSlot >= slot) return;
    this.slots.set(key, { ...state, requiredSlot: slot });
    this.notify();
  }

  // A read the floor overtook in flight keeps the last accepted data, unless it answered below its own requested slot.
  async read<T>(key: string, read: (minContextSlot: number | undefined) => Promise<GmsolSlotted<T>>): Promise<T> {
    const requestedSlot = this.getMinContextSlot(key);
    const settled = await read(requestedSlot).then(
      (response) => ({ response }),
      (error: unknown) => ({ error })
    );
    const state = this.slots.get(key);
    const floor = this.getMinContextSlot(key);
    const kept = state?.acceptedSlot === undefined ? undefined : { data: state.acceptedData as T };
    try {
      if ("error" in settled) {
        if (kept && floor !== undefined && (requestedSlot === undefined || requestedSlot < floor)) return kept.data;
        throw settled.error;
      }
      const { slot, data } = settled.response;
      const next = commitGmsolSnapshot({ requestedSlot, floor, responseSlot: slot, response: data });
      if (!next) return kept ? kept.data : data;
      this.slots.set(key, { ...state, acceptedSlot: next.slot, acceptedData: next.data, error: undefined });
      this.notify();
      return next.data;
    } catch (error) {
      this.fail(key, error);
      throw error;
    }
  }
}
