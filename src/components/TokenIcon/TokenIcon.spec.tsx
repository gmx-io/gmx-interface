import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import TokenIcon from "./TokenIcon";

afterEach(cleanup);

const BADGE_WITH_MISSING_ICON = ["WAVAX", "UNKNOWN-TOKEN"] as const;

describe("TokenIcon", () => {
  it("renders the token icon for a known symbol", () => {
    const { container } = render(<TokenIcon symbol="AVAX" displaySize={16} />);

    expect(container.querySelector("img")?.getAttribute("alt")).toBe("AVAX");
  });

  it("renders nothing instead of throwing when the icon is missing", () => {
    const { container } = render(<TokenIcon symbol="AVAX/USD [WAVAX-WAVAX]" displaySize={16} />);

    expect(container.innerHTML).toBe("");
  });

  it("skips missing badge icons instead of throwing", () => {
    const { container } = render(<TokenIcon symbol="AVAX" displaySize={40} badge={BADGE_WITH_MISSING_ICON} />);

    expect(Array.from(container.querySelectorAll("img")).map((img) => img.getAttribute("alt"))).toEqual([
      "AVAX",
      "WAVAX",
    ]);
  });
});
