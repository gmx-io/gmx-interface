import assert from "node:assert/strict";
import { test } from "node:test";
import type { Page } from "@playwright/test";

import type { FundedSession } from "./session";
import { openUiPosition } from "./uiTrading";
import type { UiWallet } from "./uiWallet";

test("UI opening never claims ownership of inventory found before its first submission", async () => {
  const owned: string[] = [];
  const session = {
    active: { ownedPositionKeys: owned },
    snapshot: async () => ({
      positions: [{ key: "someone-else" }],
      onchainPositionCount: 1,
      orders: [],
      onchainOrderCount: 0,
    }),
    previousAction: async () => undefined,
    save: async () => assert.fail("Must not record ownership"),
  } as unknown as FundedSession;
  await assert.rejects(openUiPosition(session, {} as UiWallet, {} as Page, true), /empty inventory/);
  assert.deepEqual(owned, []);
});
