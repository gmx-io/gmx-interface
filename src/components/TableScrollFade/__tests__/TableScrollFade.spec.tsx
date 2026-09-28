import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TableScrollFadeContainer } from "../TableScrollFade";

function rect(left: number, width: number): DOMRect {
  return {
    x: left,
    y: 0,
    left,
    right: left + width,
    top: 0,
    bottom: 40,
    width,
    height: 40,
    toJSON: () => undefined,
  };
}

describe("TableScrollFadeContainer", () => {
  const scrollTo = vi.fn(function (this: HTMLElement, options: ScrollToOptions) {
    this.scrollLeft = Number(options.left);
  });

  beforeEach(() => {
    i18n.load({ en: {} });
    i18n.activate("en");
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = vi.fn();
        disconnect = vi.fn();
      }
    );
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(600);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(200);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this instanceof HTMLTableCellElement) {
        return rect(this.cellIndex * 120, 120);
      }

      return rect(0, 200);
    });
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: scrollTo,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    scrollTo.mockClear();
    delete (HTMLElement.prototype as Partial<HTMLElement>).scrollTo;
  });

  it("provides a labelled keyboard focus target and operable scroll controls", async () => {
    render(
      <I18nProvider i18n={i18n}>
        <TableScrollFadeContainer ariaLabel="Rewards test table">
          <table>
            <thead>
              <tr>
                <th>One</th>
                <th>Two</th>
                <th>Three</th>
              </tr>
            </thead>
          </table>
        </TableScrollFadeContainer>
      </I18nProvider>
    );

    const region = screen.getByRole("region", { name: "Rewards test table" });
    region.focus();
    expect(document.activeElement).toBe(region);

    const scrollRight = screen.getByRole("button", { name: "Scroll right" });
    await waitFor(() => expect(scrollRight.hasAttribute("disabled")).toBe(false));
    fireEvent.click(scrollRight);

    expect(scrollTo).toHaveBeenCalledWith({ left: 80, behavior: "smooth" });
  });

  it("does not add an unnamed region or focus stop to legacy consumers", () => {
    const { container } = render(
      <I18nProvider i18n={i18n}>
        <TableScrollFadeContainer>
          <div>Content</div>
        </TableScrollFadeContainer>
      </I18nProvider>
    );

    expect(screen.queryByRole("region")).toBeNull();
    expect(container.querySelector('[tabindex="0"]')).toBeNull();
  });
});
