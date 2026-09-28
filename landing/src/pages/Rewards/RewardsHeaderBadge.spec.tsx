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

  it("switches both badge labels from Soon to Live when the indexed start time arrives", async () => {
    mockConfig.mockReturnValue({ data: { programStartTimestamp: now / 1000 + 5 } } as never);
    const view = render(<Page />);
    expect(view.getByTitle("Season 1 · Soon")).toBeTruthy();

    await act(async () => vi.advanceTimersByTimeAsync(4_999));
    expect(view.getByText("Soon")).toBeTruthy();

    await act(async () => vi.advanceTimersByTimeAsync(2));
    expect(view.getByTitle("Season 1 · Live")).toBeTruthy();
    expect(view.getByText("Live")).toBeTruthy();
    expect(view.queryByText("Soon")).toBeNull();
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
    expect(vi.getTimerCount()).toBe(1);

    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
