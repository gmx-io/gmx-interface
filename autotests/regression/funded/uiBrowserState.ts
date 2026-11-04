import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { open, readFile, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import type { BrowserContext, Page } from "@playwright/test";
import type { FundedSession } from "./session";

function filename(session: FundedSession) {
  assert.match(session.active.id, /^[a-zA-Z0-9-]+$/);
  return join(session.directory, `ui-session-${session.active.id}.json`);
}

export async function saveUiBrowserState(session: FundedSession, context: BrowserContext, origin: string) {
  if (!session.active.inventory?.uiOneClickAuthorized || session.active.inventory.uiOneClickRevoked) return;
  const state = await context.storageState();
  const storage = state.origins.find((entry) => entry.origin === new URL(origin).origin);
  if (!storage) return;
  // Contains the limited 1CT key. Keep it outside reports, readable only by the current OS user.
  const target = filename(session);
  const temporary = `${target}.tmp`;
  const file = await open(temporary, "w", 0o600);
  try {
    await file.chmod(0o600);
    await file.writeFile(JSON.stringify(storage));
    await file.sync();
  } finally {
    await file.close();
  }
  await rename(temporary, target);
}

export async function restoreUiBrowserState(session: FundedSession, page: Page, origin: string) {
  if (!session.active.inventory?.uiOneClickAuthorized || session.active.inventory.uiOneClickRevoked) return false;
  let saved: { origin: string; localStorage: { name: string; value: string }[] };
  try {
    saved = JSON.parse(await readFile(filename(session), "utf8"));
  } catch {
    throw new Error("Saved 1CT browser session is missing; cleanup is required before another activation");
  }
  assert.equal(saved.origin, new URL(origin).origin, "1CT session belongs to another deployment");
  await page.addInitScript(
    (state) => {
      if (location.origin !== state.origin || sessionStorage.getItem("funded-session-restored") === state.restoreId)
        return;
      // Start from only the saved session: a page that unloaded after the wallet disconnected may have stored that state.
      localStorage.clear();
      sessionStorage.clear();
      for (const { name, value } of state.localStorage) localStorage.setItem(name, value);
      sessionStorage.setItem("funded-session-restored", state.restoreId);
    },
    { ...saved, restoreId: randomUUID() }
  );
  return true;
}

export async function removeUiBrowserState(session: FundedSession) {
  await rm(filename(session), { force: true });
  await rm(`${filename(session)}.tmp`, { force: true });
}
