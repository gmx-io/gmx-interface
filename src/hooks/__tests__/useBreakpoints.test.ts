import { renderHook, act } from "@testing-library/react";
import { useBreakpoints } from "../useBreakpoints";

describe.skip("useBreakpoints", () => {
  const originalInnerWidth = window.innerWidth;

  afterEach(() => {
    // Restore the original innerWidth
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: originalInnerWidth,
    });
  });

  it("should return correct breakpoint for mobile", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 375,
    });

    const { result } = renderHook(() => useBreakpoints());

    expect(result.current.breakpoint).toBe("xs");
    expect(result.current.mobile).toBe(true);
    expect(result.current.desktop).toBe(false);
  });

  it("should return correct breakpoint for desktop", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 1440,
    });

    const { result } = renderHook(() => useBreakpoints());

    expect(result.current.breakpoint).toBe("lg");
    expect(result.current.mobile).toBe(false);
    expect(result.current.desktop).toBe(true);
  });

  it("should handle resize events", () => {
    const { result } = renderHook(() => useBreakpoints());

    act(() => {
      // Simulate resize to mobile width
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        value: 375,
      });
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current.mobile).toBe(true);

    act(() => {
      // Simulate resize to desktop width
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        value: 1440,
      });
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current.desktop).toBe(true);
  });
});
