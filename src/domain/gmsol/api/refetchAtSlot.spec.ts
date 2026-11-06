import { expect, it } from "vitest";

import { commitGmsolSnapshot } from "./refetchAtSlot";

it.each`
  scenario                          | accepted     | responseSlot | previous     | response   | data       | slot         | stored
  ${"first slotted snapshot"}       | ${undefined} | ${2}         | ${undefined} | ${"newer"} | ${"newer"} | ${2}         | ${true}
  ${"same slot refresh"}            | ${2}         | ${2}         | ${"kept"}    | ${"newer"} | ${"newer"} | ${2}         | ${true}
  ${"newer slot"}                   | ${2}         | ${3}         | ${"kept"}    | ${"newer"} | ${"newer"} | ${3}         | ${true}
  ${"older slot"}                   | ${2}         | ${1}         | ${"kept"}    | ${"newer"} | ${"kept"}  | ${2}         | ${false}
  ${"header missing after a slot"}  | ${2}         | ${undefined} | ${"kept"}    | ${"newer"} | ${"newer"} | ${2}         | ${true}
  ${"header missing on first read"} | ${undefined} | ${undefined} | ${undefined} | ${"body"}  | ${"body"}  | ${undefined} | ${true}
`("keeps the newest Solana slot: $scenario", ({ accepted, responseSlot, previous, response, data, slot, stored }) => {
  expect(commitGmsolSnapshot({ acceptedSlot: accepted, responseSlot, response, previous })).toEqual({
    data,
    slot,
    accepted: stored,
  });
});
