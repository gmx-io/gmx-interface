import { describe, expect, it } from "vitest";

import { AppUpdateStatus, FRESH_SESSION_MS, getAppUpdateAction, HIDDEN_IDLE_MS, SNOOZE_MS } from "./appUpdateDecision";

const NOW = 1_756_200_000_000;

function getStatus(overrides: Partial<AppUpdateStatus> = {}): AppUpdateStatus {
  return {
    updateBuildId: "200",
    isReloadBlocked: false,
    isOnline: true,
    hiddenSince: undefined,
    snoozedUntil: undefined,
    hasReloaded: false,
    hasInteracted: true,
    appStartedAt: NOW - FRESH_SESSION_MS,
    now: NOW,
    ...overrides,
  };
}

describe("getAppUpdateAction", () => {
  it("does nothing until a newer build is served", () => {
    expect(getAppUpdateAction(getStatus({ updateBuildId: undefined }))).toBe("none");
  });

  it("offers the update to someone who is using the app", () => {
    expect(getAppUpdateAction(getStatus())).toBe("offer");
  });

  it("reloads a launch that has not been touched yet", () => {
    const relaunch = { appStartedAt: NOW - FRESH_SESSION_MS + 1000, hasInteracted: false };

    expect(getAppUpdateAction(getStatus(relaunch))).toBe("reload");
    expect(getAppUpdateAction(getStatus({ ...relaunch, hasInteracted: true }))).toBe("offer");
    expect(getAppUpdateAction(getStatus({ ...relaunch, appStartedAt: NOW - FRESH_SESSION_MS }))).toBe("offer");
  });

  it("reloads an app that has been out of sight for long enough", () => {
    expect(getAppUpdateAction(getStatus({ hiddenSince: NOW - HIDDEN_IDLE_MS }))).toBe("reload");
    expect(getAppUpdateAction(getStatus({ hiddenSince: NOW - HIDDEN_IDLE_MS + 1000 }))).toBe("offer");
  });

  it("never reloads an app the user can see", () => {
    const untouched = { hasInteracted: false, appStartedAt: NOW - 24 * 60 * 60 * 1000 };

    expect(getAppUpdateAction(getStatus(untouched))).toBe("offer");
  });

  it("asks rather than reloading while work is in progress", () => {
    const outOfSight = { hiddenSince: NOW - HIDDEN_IDLE_MS };

    expect(getAppUpdateAction(getStatus({ ...outOfSight, isReloadBlocked: true }))).toBe("offer");
    expect(getAppUpdateAction(getStatus({ ...outOfSight, isOnline: false }))).toBe("offer");
  });

  it("never reloads twice for the same build", () => {
    const outOfSight = { hiddenSince: NOW - HIDDEN_IDLE_MS, hasReloaded: true };

    expect(getAppUpdateAction(getStatus(outOfSight))).toBe("offer");
    expect(getAppUpdateAction(getStatus({ ...outOfSight, hasInteracted: false, appStartedAt: NOW }))).toBe("offer");
  });

  it("holds the offer back after it is declined and makes it again later", () => {
    const declined = { snoozedUntil: NOW + SNOOZE_MS };

    expect(getAppUpdateAction(getStatus(declined))).toBe("none");
    expect(getAppUpdateAction(getStatus({ ...declined, hiddenSince: NOW - HIDDEN_IDLE_MS }))).toBe("none");
    expect(getAppUpdateAction(getStatus({ snoozedUntil: NOW }))).toBe("offer");
  });
});
