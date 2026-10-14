import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { BrowserContext, Page } from "@playwright/test";
import type { FundedSession } from "./session";
import { saveUiBrowserState, restoreUiBrowserState, removeUiBrowserState } from "./uiBrowserState";

test("1CT retry state is private, deployment-bound, and removed after revocation", async () => {
  const directory = await mkdtemp(join(tmpdir(), "gmx-ui-retry-"));
  const session = {
    directory,
    active: { id: "test-run", inventory: { uiOneClickAuthorized: "true" } },
  } as unknown as FundedSession;
  const storage = { origin: "http://localhost:3041", localStorage: [{ name: "test-only-value", value: "disposable" }] };
  const context = { storageState: async () => ({ origins: [storage], cookies: [] }) } as unknown as BrowserContext;
  let restored: unknown;
  const page = {
    addInitScript: async (_script: unknown, state: unknown) => {
      restored = state;
    },
  } as unknown as Page;
  try {
    await saveUiBrowserState(session, context, storage.origin);
    const path = join(directory, "ui-session-test-run.json");
    assert.equal((await stat(path)).mode & 0o777, 0o600);
    assert.deepEqual(JSON.parse(await readFile(path, "utf8")), storage);
    assert.ok(await restoreUiBrowserState(session, page, storage.origin));
    assert.deepEqual(restored, storage);
    await assert.rejects(restoreUiBrowserState(session, page, "https://another-preview.example"), /another deployment/);
    await removeUiBrowserState(session);
    assert.deepEqual(await readdir(directory), []);
    await assert.rejects(restoreUiBrowserState(session, page, storage.origin), /cleanup is required/);
    session.active.inventory!.uiOneClickRevoked = "true";
    await saveUiBrowserState(session, context, storage.origin);
    assert.deepEqual(await readdir(directory), []);
    assert.equal(await restoreUiBrowserState(session, page, storage.origin), false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
