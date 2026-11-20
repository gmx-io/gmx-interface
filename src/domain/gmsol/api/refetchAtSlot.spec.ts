import { expect, it } from "vitest";

import { commitGmsolSnapshot } from "./refetchAtSlot";

it.each`
  scenario                          | acceptedSlot | responseSlot | rejected
  ${"first slotted snapshot"}       | ${undefined} | ${0}         | ${false}
  ${"same slot refresh"}            | ${2}         | ${2}         | ${false}
  ${"newer slot"}                   | ${2}         | ${3}         | ${false}
  ${"older slot"}                   | ${2}         | ${1}         | ${true}
  ${"header missing after a slot"}  | ${2}         | ${undefined} | ${true}
  ${"header missing on first read"} | ${undefined} | ${undefined} | ${true}
`("requires a verified Solana slot: $scenario", ({ acceptedSlot, responseSlot, rejected }) => {
  const commit = () => commitGmsolSnapshot({ acceptedSlot, responseSlot, response: "body" });
  if (rejected) {
    expect(commit).toThrow();
  } else {
    expect(commit()).toEqual({ data: "body", slot: responseSlot });
  }
});
