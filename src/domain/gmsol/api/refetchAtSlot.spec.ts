import { expect, it } from "vitest";

import { HttpError } from "sdk/utils/http/http";

import { commitGmsolSnapshot, raisePendingMinContextSlot, readAtMinContextSlot } from "./refetchAtSlot";

it.each`
  scenario                    | slotFailure                                 | current                        | result       | error
  ${"slot is reached"}        | ${undefined}                                | ${"current"}                   | ${"slot"}    | ${undefined}
  ${"400 falls back"}         | ${new HttpError(400, "ahead of the chain")} | ${"current"}                   | ${"current"} | ${undefined}
  ${"503 falls back"}         | ${new HttpError(503, "SLOT_NOT_REACHED")}   | ${"current"}                   | ${"current"} | ${undefined}
  ${"429 falls back"}         | ${new HttpError(429, "too many requests")}  | ${"current"}                   | ${"current"} | ${undefined}
  ${"500 is final"}           | ${new HttpError(500, "boom")}               | ${"current"}                   | ${undefined} | ${"boom"}
  ${"network error is final"} | ${new TypeError("Failed to fetch")}         | ${"current"}                   | ${undefined} | ${"Failed to fetch"}
  ${"fallback read fails"}    | ${new HttpError(503, "SLOT_NOT_REACHED")}   | ${new TypeError("still down")} | ${undefined} | ${"still down"}
`(
  "reads at minContextSlot or falls back to the current poll: $scenario",
  async ({ slotFailure, current, result, error }) => {
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
      await expect(read).resolves.toEqual(result);
    }
  }
);

it.each<[number | undefined, number, number]>([
  [undefined, 10, 10],
  [12, 8, 12],
  [10, 12, 12],
])("keeps the highest transaction slot: %s, %s", (previous, slot, expected) => {
  expect(raisePendingMinContextSlot(previous, slot)).toBe(expected);
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
