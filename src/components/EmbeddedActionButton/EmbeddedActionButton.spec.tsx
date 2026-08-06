import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EmbeddedActionButton } from "./EmbeddedActionButton";

describe("EmbeddedActionButton", () => {
  it("renders a focusable button that does not submit forms", () => {
    const onClick = vi.fn();
    const { getByRole } = render(<EmbeddedActionButton onClick={onClick}>Apply value</EmbeddedActionButton>);
    const button = getByRole("button", { name: "Apply value" });

    expect(button.getAttribute("type")).toBe("button");

    button.focus();
    expect(document.activeElement).toBe(button);

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
