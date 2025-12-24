import { describe, expect, it, vi } from "vitest";

import { withFallback } from "../withFallback";
import { testEndpoints } from "./_utils";

describe("withFallback", () => {
  describe("successful execution", () => {
    it("should return result on first successful call", async () => {
      const fn = vi.fn().mockResolvedValue("success");
      const result = await withFallback({
        fn,
        endpoints: [testEndpoints.primary, testEndpoints.secondary, testEndpoints.fallback],
      });

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith(testEndpoints.primary);
    });
  });

  describe("fallback logic", () => {
    it("should fallback through multiple endpoints", async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error("Error 1"))
        .mockRejectedValueOnce(new Error("Error 2"))
        .mockResolvedValueOnce("success");
      const result = await withFallback({
        fn,
        endpoints: [testEndpoints.primary, testEndpoints.secondary, testEndpoints.fallback],
      });

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(3);
      expect(fn).toHaveBeenNthCalledWith(1, testEndpoints.primary);
      expect(fn).toHaveBeenNthCalledWith(2, testEndpoints.secondary);
      expect(fn).toHaveBeenNthCalledWith(3, testEndpoints.fallback);
    });

    it("should call onFallback callback with correct context", async () => {
      const fn = vi.fn().mockRejectedValueOnce(new Error("Network error")).mockResolvedValueOnce("success");
      const onFallback = vi.fn();
      const result = await withFallback({
        fn,
        endpoints: [testEndpoints.primary, testEndpoints.secondary],
        onFallback,
      });

      expect(result).toBe("success");
      expect(onFallback).toHaveBeenCalledTimes(1);
      expect(onFallback).toHaveBeenCalledWith({
        endpoint: testEndpoints.primary,
        fallbacks: [testEndpoints.secondary],
      });
    });

    it("should use custom shouldFallback function", async () => {
      const fn = vi.fn().mockRejectedValueOnce(new Error("Network error")).mockResolvedValueOnce("success");
      const shouldFallback = vi.fn().mockReturnValue(true);
      const result = await withFallback({
        fn,
        endpoints: [testEndpoints.primary, testEndpoints.secondary],
        shouldFallback,
      });

      expect(result).toBe("success");
      expect(shouldFallback).toHaveBeenCalledWith(expect.any(Error));
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("should not fallback when custom shouldFallback returns false", async () => {
      const error = new Error("Network error");
      const fn = vi.fn().mockRejectedValue(error);
      const shouldFallback = vi.fn().mockReturnValue(false);
      await expect(
        withFallback({
          fn,
          endpoints: [testEndpoints.primary, testEndpoints.secondary],
          shouldFallback,
        })
      ).rejects.toThrow("Network error");

      expect(shouldFallback).toHaveBeenCalledWith(error);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should call shouldFallback with undefined when successful", async () => {
      const fn = vi.fn().mockResolvedValue("success");
      const shouldFallback = vi.fn().mockReturnValue(false);
      const result = await withFallback({
        fn,
        endpoints: [testEndpoints.primary, testEndpoints.secondary],
        shouldFallback,
      });

      expect(result).toBe("success");
      expect(shouldFallback).toHaveBeenCalledWith(undefined, "success");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should reject when all fallbacks are exhausted", async () => {
      const error = new Error("Network error");
      const fn = vi.fn().mockRejectedValue(error);
      await expect(
        withFallback({
          fn,
          endpoints: [testEndpoints.primary],
        })
      ).rejects.toThrow("Network error");

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe("error handling", () => {
    it("should reject when all fallbacks are exhausted", async () => {
      const error1 = new Error("Error 1");
      const error2 = new Error("Error 2");
      const fn = vi.fn().mockRejectedValueOnce(error1).mockRejectedValueOnce(error2);
      await expect(
        withFallback({
          fn,
          endpoints: [testEndpoints.primary, testEndpoints.secondary],
        })
      ).rejects.toThrow("Error 2");
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe("custom predicates", () => {
    it("should call predicates with undefined when result is successful", async () => {
      const fn = vi.fn().mockResolvedValue("success");
      const shouldFallback = vi.fn().mockReturnValue(false);

      const result = await withFallback({
        fn,
        endpoints: [testEndpoints.primary, testEndpoints.secondary],
        shouldFallback,
      });
      expect(result).toBe("success");
      expect(shouldFallback).toHaveBeenCalledWith(undefined, "success");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should fallback when shouldFallback returns true on error", async () => {
      const fn = vi.fn().mockRejectedValueOnce(new Error("Error")).mockResolvedValueOnce("success");
      const shouldFallback = vi.fn().mockImplementation((error?: Error) => Boolean(error));
      const result = await withFallback({
        fn,
        endpoints: [testEndpoints.primary, testEndpoints.secondary],
        shouldFallback,
      });

      expect(result).toBe("success");
      expect(shouldFallback).toHaveBeenCalledWith(expect.any(Error));
      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenNthCalledWith(1, testEndpoints.primary);
      expect(fn).toHaveBeenNthCalledWith(2, testEndpoints.secondary);
    });
  });

  describe("context tracking", () => {
    it("should track correct fallbacks array in context", async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error("Error 1"))
        .mockRejectedValueOnce(new Error("Error 2"))
        .mockResolvedValueOnce("success");
      const onFallback = vi.fn();
      const result = await withFallback({
        fn,
        endpoints: [testEndpoints.primary, testEndpoints.secondary, testEndpoints.fallback],
        onFallback,
      });

      expect(result).toBe("success");
      expect(onFallback).toHaveBeenCalledTimes(2);
      expect(onFallback).toHaveBeenNthCalledWith(1, {
        endpoint: testEndpoints.primary,
        fallbacks: [testEndpoints.secondary, testEndpoints.fallback],
      });
      expect(onFallback).toHaveBeenNthCalledWith(2, {
        endpoint: testEndpoints.secondary,
        fallbacks: [testEndpoints.fallback],
      });
    });
  });

  describe("validation", () => {
    it("should validate at least one endpoint is provided", async () => {
      const fn = vi.fn().mockResolvedValue("success");
      await expect(
        withFallback({
          fn,
          endpoints: [],
        })
      ).rejects.toThrow("At least one endpoint is required");
    });
  });

  describe("edge cases", () => {
    it("should handle many endpoints", async () => {
      const lastError = new Error("Last request error");
      const fn = vi.fn().mockRejectedValue(lastError);
      const manyEndpoints = Array(200).fill(testEndpoints.primary);
      await expect(
        withFallback({
          fn,
          endpoints: manyEndpoints,
        })
      ).rejects.toThrow("Last request error");
      expect(fn).toHaveBeenCalledTimes(200);
    });

    it("should prevent infinite fallback with malicious predicate", async () => {
      const error = new Error("Always fails");
      const fn = vi.fn().mockRejectedValue(error);
      const shouldFallback = vi.fn().mockReturnValue(true);
      await expect(
        withFallback({
          fn,
          endpoints: [testEndpoints.primary, testEndpoints.secondary],
          shouldFallback,
        })
      ).rejects.toThrow("Always fails");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("should fallback on success when shouldFallback returns true", async () => {
      const fn = vi.fn().mockResolvedValue("result");
      const shouldFallback = vi.fn().mockReturnValue(true);
      const result = await withFallback({
        fn,
        endpoints: [testEndpoints.primary, testEndpoints.secondary],
        shouldFallback,
      });

      expect(result).toBe("result");
      expect(shouldFallback).toHaveBeenCalledWith(undefined, "result");
      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenNthCalledWith(1, testEndpoints.primary);
      expect(fn).toHaveBeenNthCalledWith(2, testEndpoints.secondary);
    });

    it("should not fallback on last endpoint even if shouldFallback returns true", async () => {
      const fn = vi.fn().mockResolvedValue("result");
      const shouldFallback = vi.fn().mockReturnValue(true);
      const result = await withFallback({
        fn,
        endpoints: [testEndpoints.primary],
        shouldFallback,
      });

      expect(result).toBe("result");
      expect(shouldFallback).toHaveBeenCalledWith(undefined, "result");
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
