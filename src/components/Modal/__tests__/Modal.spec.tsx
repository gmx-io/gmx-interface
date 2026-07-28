import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import FloatingPortal from "components/Portal/FloatingPortal";

import Modal from "../Modal";
import { SlideModal } from "../SlideModal";

vi.mock("lib/useBreakpoints", () => ({
  useBreakpoints: () => ({ isMobile: true }),
}));

i18n.load({ en: {} });
i18n.activate("en");

const INVISIBLE_STYLE = { visibility: "hidden" } as const;

describe("Modal", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "animate", {
      configurable: true,
      value: vi.fn(() => ({
        addEventListener: vi.fn(),
        cancel: vi.fn(),
        commitStyles: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    cleanup();
    Reflect.deleteProperty(HTMLElement.prototype, "animate");
  });

  it("keeps keyboard focus inside the dialog and its portalled content", async () => {
    render(
      <I18nProvider i18n={i18n}>
        <button>Background action</button>
        <Modal isVisible label="Parent modal" setIsVisible={vi.fn()}>
          <button>Dialog action</button>
          <div aria-hidden="true">
            <button>Hidden action</button>
          </div>
          <button style={INVISIBLE_STYLE}>Invisible action</button>
          <FloatingPortal>
            <button>Portalled action</button>
          </FloatingPortal>
        </Modal>
      </I18nProvider>
    );

    const dialogAction = screen.getByRole("button", { name: "Dialog action" });
    const portalledAction = screen.getByRole("button", { name: "Portalled action" });
    const closeButton = screen.getByRole("button", { name: "Close" });

    await waitFor(() =>
      expect(screen.getByRole("dialog", { name: "Parent modal" }).contains(document.activeElement)).toBe(true)
    );

    dialogAction.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(portalledAction);

    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(closeButton);

    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(portalledAction);
    expect(document.activeElement).not.toBe(screen.getByRole("button", { name: "Background action" }));
    expect(document.activeElement).not.toBe(screen.getByText("Hidden action").closest("button"));
    expect(document.activeElement).not.toBe(screen.getByText("Invisible action").closest("button"));
  });

  it("lets only the topmost mobile slide modal handle Escape", () => {
    const closeParent = vi.fn();
    const closeChild = vi.fn();

    render(
      <I18nProvider i18n={i18n}>
        <Modal isVisible label="Parent modal" setIsVisible={closeParent}>
          <SlideModal isVisible label="Child modal" setIsVisible={closeChild}>
            <button>Child action</button>
          </SlideModal>
        </Modal>
      </I18nProvider>
    );

    expect(screen.getByRole("dialog", { name: "Child modal" })).toBeDefined();
    fireEvent.keyDown(window, { key: "Escape" });

    expect(closeChild).toHaveBeenCalledWith(false);
    expect(closeParent).not.toHaveBeenCalled();
  });

  it("prefers a newer unrelated modal over an older nested modal", () => {
    const closeNested = vi.fn();
    const closeNewer = vi.fn();
    const view = render(
      <I18nProvider i18n={i18n}>
        <Modal isVisible label="Parent modal" setIsVisible={vi.fn()}>
          <Modal isVisible label="Nested modal" setIsVisible={closeNested}>
            Nested content
          </Modal>
        </Modal>
      </I18nProvider>
    );

    view.rerender(
      <I18nProvider i18n={i18n}>
        <Modal isVisible label="Parent modal" setIsVisible={vi.fn()}>
          <Modal isVisible label="Nested modal" setIsVisible={closeNested}>
            Nested content
          </Modal>
        </Modal>
        <Modal isVisible label="Newer modal" setIsVisible={closeNewer}>
          Newer content
        </Modal>
      </I18nProvider>
    );

    fireEvent.keyDown(window, { key: "Escape" });

    expect(closeNewer).toHaveBeenCalledWith(false);
    expect(closeNested).not.toHaveBeenCalled();
  });
});
