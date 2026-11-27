import { act, cleanup, render } from "@testing-library/react";
import type { ChangeEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useCloseSizeInput } from "./useCloseSizeInput";

vi.mock("context/SettingsContext/SettingsContextProvider", () => ({
  useSettings: () => ({ showCloseSizeInTokens: true, setShowCloseSizeInTokens: () => undefined }),
}));

const POSITION_SIZE_USD = 20_580_351_234_567_890_000_000_000_000_000_000n;
const POSITION_SIZE_IN_TOKENS = 10_010_123_456_789_012_345n;

let closeSize: ReturnType<typeof useCloseSizeInput>;

// the editor passes forceUsd while there is no position
function Harness({ hasPosition }: { hasPosition: boolean }) {
  closeSize = useCloseSizeInput({
    forceUsd: !hasPosition,
    positionSizeInUsd: hasPosition ? POSITION_SIZE_USD : undefined,
    positionSizeInTokens: hasPosition ? POSITION_SIZE_IN_TOKENS : undefined,
    indexTokenDecimals: 18,
    indexTokenSymbol: "ETH",
  });
  return null;
}

describe("useCloseSizeInput", () => {
  afterEach(cleanup);

  it("drops an amount typed in tokens when the position closes", () => {
    const { rerender } = render(<Harness hasPosition />);
    act(() => closeSize.handleInputChange({ target: { value: "5.0049" } } as ChangeEvent<HTMLInputElement>));
    expect(closeSize.closeSizeUsd > 0n).toBe(true);

    rerender(<Harness hasPosition={false} />);

    expect([closeSize.closeSizeInput, closeSize.closeSizeUsd]).toEqual(["", 0n]);
  });
});
