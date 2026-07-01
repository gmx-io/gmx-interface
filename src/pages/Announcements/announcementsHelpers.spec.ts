import { describe, expect, it } from "vitest";

import type { EventData } from "config/events";
import type { UiFlags } from "domain/synthetics/uiFlags/useUiFlagsRequest";

import { getEventSortDate, getEventStartDate, isEventActiveByFlag, parseEventDate } from "./announcementsHelpers";

function makeEvent(overrides: Partial<EventData>): EventData {
  return {
    id: "test",
    type: "listing",
    title: "Test",
    description: "Body",
    endDate: "10 May 2026, 12:00",
    ...overrides,
  };
}

function flags(createdAt: string, enabled = true): UiFlags {
  return { f: { enabled, createdAt, updatedAt: createdAt } };
}

describe("getEventStartDate", () => {
  it("uses an explicit startDate over the flag createdAt", () => {
    const event = makeEvent({ startDate: "01 May 2026, 12:00", flagId: "f" });
    expect(getEventStartDate(event, flags("2026-05-05T00:00:00.000Z"))).toEqual(parseEventDate("01 May 2026, 12:00"));
  });

  it("uses the flag createdAt when there is no explicit startDate", () => {
    const event = makeEvent({ flagId: "f" });
    expect(getEventStartDate(event, flags("2026-05-05T00:00:00.000Z"))).toEqual(new Date("2026-05-05T00:00:00.000Z"));
  });

  it("returns undefined when there is neither a startDate nor a flag createdAt", () => {
    expect(getEventStartDate(makeEvent({ isActive: true }), undefined)).toBeUndefined();
    expect(getEventStartDate(makeEvent({ flagId: "f" }), undefined)).toBeUndefined();
    expect(getEventStartDate(makeEvent({ flagId: "f" }), {})).toBeUndefined();
  });
});

describe("getEventSortDate", () => {
  it("returns the flag go-live date, not the endDate", () => {
    const event = makeEvent({ flagId: "f" });
    expect(getEventSortDate(event, flags("2026-05-05T00:00:00.000Z"))).toEqual(new Date("2026-05-05T00:00:00.000Z"));
  });

  it("falls back to endDate only when no start is resolvable", () => {
    expect(getEventSortDate(makeEvent({ isActive: true }), undefined)).toEqual(parseEventDate("10 May 2026, 12:00"));
  });

  it("uses an explicit startDate over the flag createdAt and endDate", () => {
    const event = makeEvent({ startDate: "01 May 2026, 12:00", flagId: "f" });
    expect(getEventSortDate(event, flags("2026-05-05T00:00:00.000Z"))).toEqual(parseEventDate("01 May 2026, 12:00"));
  });
});

describe("isEventActiveByFlag", () => {
  it("is true only when the flag is enabled", () => {
    const event = makeEvent({ flagId: "f" });
    expect(isEventActiveByFlag(event, flags("x", true))).toBe(true);
    expect(isEventActiveByFlag(event, flags("x", false))).toBe(false);
    expect(isEventActiveByFlag(event, {})).toBe(false);
  });

  it("honors isActive for non-flag events", () => {
    expect(isEventActiveByFlag(makeEvent({ isActive: true }), undefined)).toBe(true);
    expect(isEventActiveByFlag(makeEvent({ isActive: false }), undefined)).toBe(false);
  });
});
