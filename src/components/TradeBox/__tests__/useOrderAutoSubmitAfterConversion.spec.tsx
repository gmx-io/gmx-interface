import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useOrderAutoSubmitAfterConversion } from "../hooks/useOrderAutoSubmitAfterConversion";

const readyButton = {
  disabled: false,
  isExpressLoading: false,
  approvalTokenAddress: undefined,
  isApproving: false,
  isAllowanceLoaded: true,
};

const USDG = "0x004B506865409877C9fA29bfb1ebA929984B9bbC";
const approvalButton = { ...readyButton, approvalTokenAddress: USDG };
const allowanceLoadingButton = { ...readyButton, isAllowanceLoaded: false };
const approvingButton = { ...approvalButton, disabled: true, isApproving: true };

function Harness({
  onSubmit,
  stop = () => undefined,
  buttonState = readyButton,
}: {
  onSubmit: () => Promise<void>;
  stop?: () => void;
  buttonState?:
    | typeof readyButton
    | {
        disabled: boolean;
        isExpressLoading: boolean;
        approvalTokenAddress: string;
        isApproving: boolean;
        isAllowanceLoaded: boolean;
      };
}) {
  useOrderAutoSubmitAfterConversion({ isPending: true, stop, buttonState, isDepositButtonShown: false, onSubmit });

  return null;
}

describe("useOrderAutoSubmitAfterConversion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("submits once the button settles even though price ticks keep recreating the submit handler", () => {
    let submitCount = 0;
    const makeOnSubmit = () => () => {
      submitCount += 1;
      return Promise.resolve();
    };
    const { rerender } = render(<Harness onSubmit={makeOnSubmit()} />);

    for (let tick = 0; tick < 10; tick++) {
      act(() => {
        vi.advanceTimersByTime(500);
      });
      rerender(<Harness onSubmit={makeOnSubmit()} />);
    }

    expect(submitCount).toBe(1);
  });

  it("approves first, then places the order once the approval lands", async () => {
    const onSubmit = vi.fn(() => Promise.resolve());
    const stop = vi.fn();
    const { rerender } = render(<Harness onSubmit={onSubmit} stop={stop} buttonState={approvalButton} />);

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(stop).not.toHaveBeenCalled();

    rerender(<Harness onSubmit={onSubmit} stop={stop} buttonState={approvingButton} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);

    rerender(<Harness onSubmit={onSubmit} stop={stop} buttonState={readyButton} />);
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(onSubmit).toHaveBeenCalledTimes(2);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("waits for the allowance before deciding between the approval and the order", () => {
    const onSubmit = vi.fn(() => Promise.resolve());
    render(<Harness onSubmit={onSubmit} buttonState={allowanceLoadingButton} />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
