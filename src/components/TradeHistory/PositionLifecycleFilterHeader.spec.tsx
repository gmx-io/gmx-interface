import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { PositionLifecycleFilterHeader } from "./PositionLifecycleFilterHeader";

beforeAll(() => {
  i18n.load("en", {});
  i18n.activate("en");
});

afterEach(cleanup);

function renderHeader(props: Parameters<typeof PositionLifecycleFilterHeader>[0]) {
  return render(
    <I18nProvider i18n={i18n}>
      <PositionLifecycleFilterHeader {...props} />
    </I18nProvider>
  );
}

describe("PositionLifecycleFilterHeader", () => {
  it("shows the market label and the lifecycle action count", () => {
    const { getByText } = renderHeader({
      indexName: "XRP/USD",
      isLong: false,
      tokenSymbol: "XRP",
      count: 49,
      onClear: vi.fn(),
    });

    expect(getByText("XRP/USD")).toBeTruthy();
    expect(getByText(/49 actions in this lifecycle/)).toBeTruthy();
  });

  it("uses the singular form for a single action", () => {
    const { getByText } = renderHeader({
      indexName: "XRP/USD",
      isLong: true,
      tokenSymbol: "XRP",
      count: 1,
      onClear: vi.fn(),
    });

    expect(getByText(/1 action in this lifecycle/)).toBeTruthy();
  });

  it("calls onClear when the close button is clicked", () => {
    const onClear = vi.fn();
    const { getByRole } = renderHeader({
      indexName: undefined,
      isLong: undefined,
      tokenSymbol: undefined,
      count: undefined,
      onClear,
    });

    fireEvent.click(getByRole("button"));

    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
