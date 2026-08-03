import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  WALLET_EXTENSION_CONNECTION_BANNER_END,
  WALLET_EXTENSION_CONNECTION_BANNER_START,
  useWalletExtensionConnectionBanner,
} from "./useWalletExtensionConnectionBanner";

function TestComponent({ pathname }: { pathname: string }) {
  const { isVisible, dismiss } = useWalletExtensionConnectionBanner(pathname);

  if (!isVisible) return null;

  return <button onClick={dismiss}>Banner</button>;
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useWalletExtensionConnectionBanner", () => {
  it("is visible during the configured window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(WALLET_EXTENSION_CONNECTION_BANNER_START);

    render(<TestComponent pathname="/trade" />);

    expect(screen.getByRole("button", { name: "Banner" })).toBeTruthy();
  });

  it("is hidden on the announcements page", () => {
    vi.useFakeTimers();
    vi.setSystemTime(WALLET_EXTENSION_CONNECTION_BANNER_START);

    render(<TestComponent pathname="/announcements" />);

    expect(screen.queryByRole("button", { name: "Banner" })).toBeNull();
  });

  it("can be dismissed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(WALLET_EXTENSION_CONNECTION_BANNER_START);

    render(<TestComponent pathname="/trade" />);
    fireEvent.click(screen.getByRole("button", { name: "Banner" }));

    expect(screen.queryByRole("button", { name: "Banner" })).toBeNull();
  });

  it("hides when the configured window ends", () => {
    vi.useFakeTimers();
    vi.setSystemTime(WALLET_EXTENSION_CONNECTION_BANNER_END - 1);

    render(<TestComponent pathname="/trade" />);
    expect(screen.getByRole("button", { name: "Banner" })).toBeTruthy();

    act(() => vi.advanceTimersByTime(1));

    expect(screen.queryByRole("button", { name: "Banner" })).toBeNull();
  });
});
