import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RewardsClosingNote } from "./RewardsClosingNote";

const config = {
  programStartTimestamp: Date.parse("2026-09-30T00:00:00Z") / 1000,
  epochTimestamp: Date.parse("2026-09-30T00:00:00Z") / 1000,
  epochDuration: 604800,
};

function Page() {
  return (
    <I18nProvider i18n={i18n}>
      <RewardsClosingNote config={config} loading={false} />
    </I18nProvider>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-28T00:00:00Z"));
  i18n.load("en", {});
  i18n.activate("en");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("RewardsClosingNote", () => {
  it("shows the indexed launch date before the season and switches to the epoch deadline at launch", async () => {
    const view = render(<Page />);
    expect(view.container.textContent).toBe("Season 1 rewards kick off on Wednesday 30 September at 00:00 UTC");

    await act(async () => vi.advanceTimersByTimeAsync(2 * 24 * 60 * 60 * 1000 - 1));
    expect(view.container.textContent).toContain("Season 1 rewards kick off");

    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(view.container.textContent).toMatch(/^Trade before .*00:00 UTC and you're in this epoch\.$/);
    expect(view.container.querySelector("time")?.dateTime).toBe("2026-10-07T00:00:00.000Z");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("uses the epoch deadline when opened after launch", () => {
    vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
    const view = render(<Page />);
    expect(view.container.textContent).toContain("Trade before");
    expect(view.container.textContent).not.toContain("kick off");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cleans up the launch timer when leaving the page", () => {
    const view = render(<Page />);
    expect(vi.getTimerCount()).toBe(1);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
