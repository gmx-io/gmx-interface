// @vitest-shared-worker
import { expect, it } from "vitest";

import { commitGmsolSnapshot } from "./refetchAtSlot";

it.each`
  scenario                                      | requestedSlot | floor        | responseSlot | result
  ${"first slotted snapshot"}                   | ${undefined}  | ${undefined} | ${0}         | ${"accepted"}
  ${"same slot refresh"}                        | ${2}          | ${2}         | ${2}         | ${"accepted"}
  ${"newer slot"}                               | ${2}          | ${2}         | ${3}         | ${"accepted"}
  ${"older than its own request"}               | ${2}          | ${2}         | ${1}         | ${"rejected"}
  ${"overtaken in flight"}                      | ${2}          | ${5}         | ${3}         | ${"outdated"}
  ${"first read overtaken in flight"}           | ${undefined}  | ${5}         | ${3}         | ${"outdated"}
  ${"overtaken and older than its own request"} | ${2}          | ${5}         | ${1}         | ${"rejected"}
  ${"reaching a floor that rose in flight"}     | ${2}          | ${5}         | ${5}         | ${"accepted"}
  ${"header missing after a slot"}              | ${2}          | ${2}         | ${undefined} | ${"rejected"}
  ${"header missing on first read"}             | ${undefined}  | ${undefined} | ${undefined} | ${"rejected"}
`("requires a verified Solana slot: $scenario", ({ requestedSlot, floor, responseSlot, result }) => {
  const commit = () => commitGmsolSnapshot({ requestedSlot, floor, responseSlot, response: "body" });
  if (result === "rejected") {
    expect(commit).toThrow();
  } else {
    expect(commit()).toEqual(result === "accepted" ? { data: "body", slot: responseSlot } : undefined);
  }
});
