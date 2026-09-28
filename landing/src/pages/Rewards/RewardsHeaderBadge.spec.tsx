import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useIncentivesConfig } from "domain/synthetics/incentives/v2/useIncentivesConfig";

import { RewardsHeaderBadge } from "./RewardsHeaderBadge";

vi.mock("domain/synthetics/incentives/v2/useIncentivesConfig", () => ({
  useIncentivesConfig: vi.fn(),
}));

const now = 1_790_553_600_000;
const mockConfig = vi.mocked(useIncentivesConfig);

function Page() {
  return (
    <I18nProvider i18n={i18n}>
      <RewardsHeaderBadge />
    </I18nProvider>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  mockConfig.mockReset();
  i18n.load("en", {});
  i18n.activate("en");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("RewardsHeaderBadge", () => {
  it.each([undefined, null])("does not advertise Live when the configuration is %s", (data) => {
    mockConfig.mockReturnValue({ data } as never);
    const view = render(<Page />);
    expect(view.getByTitle("Season 1 · Soon")).toBeTruthy();
    expect(view.getByText("Soon")).toBeTruthy();
    expect(view.queryByText("Live")).toBeNull();
  });

  it("shows total hours and minutes and updates at the next countdown minute", async () => {
    const untilStart = (48 * 60 + 22) * 60 + 30;
    mockConfig.mockReturnValue({ data: { programStartTimestamp: now / 1000 + untilStart } } as never);
    const view = render(<Page />);
    expect(view.getByTitle("Season 1 - 48h 23m")).toBeTruthy();
    expect(view.container.querySelector(".rewards-live-full")?.textContent).toBe("Season 1 - 48h 23m");
    expect(view.container.querySelector(".rewards-live-compact")?.textContent).toBe("48h 23m");
    expect(view.queryByText("Soon")).toBeNull();

    await act(async () => vi.advanceTimersByTimeAsync(30_000));
    expect(view.getByTitle("Season 1 - 48h 22m")).toBeTruthy();

    await act(async () => vi.advanceTimersByTimeAsync(60_000));
    expect(view.getByTitle("Season 1 - 48h 21m")).toBeTruthy();
  });

  it("rolls hours into minutes as the launch approaches", async () => {
    mockConfig.mockReturnValue({ data: { programStartTimestamp: now / 1000 + 3600 } } as never);
    const view = render(<Page />);
    expect(view.getByTitle("Season 1 - 1h 0m")).toBeTruthy();

    await act(async () => vi.advanceTimersByTimeAsync(60_000));
    expect(view.getByTitle("Season 1 - 0h 59m")).toBeTruthy();
  });

  it("switches both countdown labels to Live exactly when the indexed start time arrives", async () => {
    mockConfig.mockReturnValue({ data: { programStartTimestamp: now / 1000 + 5 } } as never);
    const view = render(<Page />);
    expect(view.getByTitle("Season 1 - 0h 1m")).toBeTruthy();

    await act(async () => vi.advanceTimersByTimeAsync(4_999));
    expect(view.getByTitle("Season 1 - 0h 1m")).toBeTruthy();

    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(view.getByTitle("Season 1 · Live")).toBeTruthy();
    expect(view.getByText("Live")).toBeTruthy();
    expect(view.queryByText("Soon")).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([0, -60])("shows Live when the start is %s seconds from now", (offset) => {
    mockConfig.mockReturnValue({ data: { programStartTimestamp: now / 1000 + offset } } as never);
    expect(render(<Page />).getByTitle("Season 1 · Live")).toBeTruthy();
  });

  it("updates when a delayed configuration arrives and cancels its timer on unmount", () => {
    mockConfig.mockReturnValue({ data: null } as never);
    const view = render(<Page />);

    mockConfig.mockReturnValue({ data: { programStartTimestamp: now / 1000 + 60 } } as never);
    view.rerender(<Page />);
    expect(view.getByTitle("Season 1 - 0h 1m")).toBeTruthy();
    expect(vi.getTimerCount()).toBe(1);

    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reschedules the countdown when the indexed start time changes", async () => {
    mockConfig.mockReturnValue({ data: { programStartTimestamp: now / 1000 + 5 } } as never);
    const view = render(<Page />);

    mockConfig.mockReturnValue({ data: { programStartTimestamp: now / 1000 + 125 } } as never);
    view.rerender(<Page />);
    expect(view.getByTitle("Season 1 - 0h 3m")).toBeTruthy();
    expect(vi.getTimerCount()).toBe(1);

    await act(async () => vi.advanceTimersByTimeAsync(5_000));
    expect(view.getByTitle("Season 1 - 0h 2m")).toBeTruthy();
    expect(view.queryByText("Live")).toBeNull();

    mockConfig.mockReturnValue({ data: null } as never);
    view.rerender(<Page />);
    expect(view.getByTitle("Season 1 · Soon")).toBeTruthy();
    expect(vi.getTimerCount()).toBe(0);
  });
});
