import { expect, it } from "vitest";

import { HttpError } from "sdk/utils/http/http";

import {
  commitGmsolSnapshot,
  parseSolanaSlotHeader,
  pendingMinContextSlotAfterRead,
  raisePendingMinContextSlot,
  readAtMinContextSlot,
} from "./refetchAtSlot";

it.each`
  scenario                    | slotFailure                                 | current                        | result       | reachedSlot | error
  ${"slot is reached"}        | ${undefined}                                | ${"current"}                   | ${"slot"}    | ${true}     | ${undefined}
  ${"400 falls back"}         | ${new HttpError(400, "ahead of the chain")} | ${"current"}                   | ${"current"} | ${false}    | ${undefined}
  ${"503 falls back"}         | ${new HttpError(503, "SLOT_NOT_REACHED")}   | ${"current"}                   | ${"current"} | ${false}    | ${undefined}
  ${"429 falls back"}         | ${new HttpError(429, "too many requests")}  | ${"current"}                   | ${"current"} | ${false}    | ${undefined}
  ${"500 is final"}           | ${new HttpError(500, "boom")}               | ${"current"}                   | ${undefined} | ${false}    | ${"boom"}
  ${"network error is final"} | ${new TypeError("Failed to fetch")}         | ${"current"}                   | ${undefined} | ${false}    | ${"Failed to fetch"}
  ${"fallback read fails"}    | ${new HttpError(503, "SLOT_NOT_REACHED")}   | ${new TypeError("still down")} | ${undefined} | ${false}    | ${"still down"}
`(
  "reads at minContextSlot or falls back to the current poll: $scenario",
  async ({ slotFailure, current, result, reachedSlot, error }) => {
    const read = readAtMinContextSlot(
      async () => {
        if (slotFailure) {
          throw slotFailure;
        }
        return "slot";
      },
      async () => {
        if (current instanceof Error) {
          throw current;
        }
        return current;
      }
    );

    if (error) {
      await expect(read).rejects.toThrow(error);
    } else {
      await expect(read).resolves.toEqual({ data: result, reachedSlot });
    }
  }
);

it.each`
  scenario                         | op         | pending      | slot  | reached  | next
  ${"first transaction"}           | ${"raise"} | ${undefined} | ${10} | ${false} | ${10}
  ${"older transaction"}           | ${"raise"} | ${12}        | ${8}  | ${false} | ${12}
  ${"newer transaction"}           | ${"raise"} | ${10}        | ${12} | ${false} | ${12}
  ${"answer reaches the slot"}     | ${"read"}  | ${10}        | ${10} | ${true}  | ${undefined}
  ${"answer is for an older slot"} | ${"read"}  | ${12}        | ${10} | ${true}  | ${12}
  ${"slot was not reached"}        | ${"read"}  | ${10}        | ${10} | ${false} | ${10}
`("keeps minContextSlot until a read reaches it: $scenario", ({ op, pending, slot, reached, next }) => {
  const actual =
    op === "raise"
      ? raisePendingMinContextSlot(pending, slot)
      : pendingMinContextSlotAfterRead({ pending, requestedSlot: slot, reachedSlot: reached });

  expect(actual).toBe(next);
});

it.each`
  header      | slot
  ${null}     | ${undefined}
  ${""}       | ${undefined}
  ${"nope"}   | ${undefined}
  ${"-1"}     | ${undefined}
  ${"1.5"}    | ${undefined}
  ${"0"}      | ${0}
  ${"248331"} | ${248331}
`("reads X-Solana-Slot $header as $slot", ({ header, slot }) => {
  expect(parseSolanaSlotHeader(header)).toBe(slot);
});

it.each`
  scenario                          | accepted     | responseSlot | previous     | response   | data       | slot         | stored
  ${"first slotted snapshot"}       | ${undefined} | ${2}         | ${undefined} | ${"newer"} | ${"newer"} | ${2}         | ${true}
  ${"same slot refresh"}            | ${2}         | ${2}         | ${"kept"}    | ${"newer"} | ${"newer"} | ${2}         | ${true}
  ${"newer slot"}                   | ${2}         | ${3}         | ${"kept"}    | ${"newer"} | ${"newer"} | ${3}         | ${true}
  ${"older slot"}                   | ${2}         | ${1}         | ${"kept"}    | ${"newer"} | ${"kept"}  | ${2}         | ${false}
  ${"header missing after a slot"}  | ${2}         | ${undefined} | ${"kept"}    | ${"newer"} | ${"kept"}  | ${2}         | ${false}
  ${"header missing on first read"} | ${undefined} | ${undefined} | ${undefined} | ${"body"}  | ${"body"}  | ${undefined} | ${false}
`("keeps the newest Solana slot: $scenario", ({ accepted, responseSlot, previous, response, data, slot, stored }) => {
  expect(commitGmsolSnapshot({ acceptedSlot: accepted, responseSlot, response, previous })).toEqual({
    data,
    slot,
    accepted: stored,
  });
});
