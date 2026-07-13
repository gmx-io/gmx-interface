import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupportChatNavItem } from "../SupportChatNavItem";

const mocks = vi.hoisted(() => ({
  setSupportChatWasEverClicked: vi.fn(),
  shouldShowSupportChat: true,
  supportChatUnreadCount: 0,
  supportChatWasEverClicked: false,
}));

vi.mock("@intercom/messenger-js-sdk", () => ({
  show: vi.fn(),
}));

vi.mock("domain/supportChat/useShowSupportChat", () => ({
  useShowSupportChat: () => ({ shouldShowSupportChat: mocks.shouldShowSupportChat }),
}));

vi.mock("domain/supportChat/useSupportChatUnreadCount", () => ({
  useSupportChatUnreadCount: () => [mocks.supportChatUnreadCount],
}));

vi.mock("lib/localStorage", () => ({
  useLocalStorageSerializeKey: () => [mocks.supportChatWasEverClicked, mocks.setSupportChatWasEverClicked],
}));

vi.mock("components/AnimatedGradientText/AnimatedGradientText", () => ({
  AnimatedGradientText: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("components/SideNav/SideNav", () => ({
  NavItem: ({ icon, label, isCollapsed }: { icon: React.ReactNode; label: React.ReactNode; isCollapsed: boolean }) => (
    <button>
      {icon}
      {!isCollapsed && label}
    </button>
  ),
}));

function renderSupportChatNavItem(isCollapsed = false) {
  return render(
    <I18nProvider i18n={i18n}>
      <SupportChatNavItem isCollapsed={isCollapsed} />
    </I18nProvider>
  );
}

describe("SupportChatNavItem", () => {
  beforeEach(() => {
    i18n.load("en", {});
    i18n.activate("en");
    mocks.shouldShowSupportChat = true;
    mocks.supportChatUnreadCount = 0;
    mocks.supportChatWasEverClicked = false;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows the unread count and attention dot instead of the New badge", () => {
    mocks.supportChatUnreadCount = 2;

    const { container } = renderSupportChatNavItem();

    expect(container.querySelector(".support-chat-unread-count")?.textContent).toBe("2");
    expect(container.querySelector(".support-chat-unread-dot")).not.toBeNull();
    expect(container.textContent).not.toContain("New");
  });

  it("hides unread indicators when the count is zero", () => {
    const { container } = renderSupportChatNavItem();

    expect(container.querySelector(".support-chat-unread-count")).toBeNull();
    expect(container.querySelector(".support-chat-unread-dot")).toBeNull();
    expect(container.textContent).toContain("New");
  });

  it("keeps a capped count on the icon when collapsed", () => {
    mocks.supportChatUnreadCount = 12;

    const { container } = renderSupportChatNavItem(true);

    expect(container.querySelector(".support-chat-unread-count")?.textContent).toBe("9+");
    expect(container.querySelector(".support-chat-unread-count")?.className).toContain("absolute");
    expect(container.querySelector(".support-chat-unread-dot")).not.toBeNull();
  });
});
