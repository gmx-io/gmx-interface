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
        retryCount: 2,
      });

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith(testEndpoints.primary);
    });
  });

  describe("retry logic", () => {
    it("should retry multiple times up to retryCount", async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error("Error 1"))
        .mockRejectedValueOnce(new Error("Error 2"))
        .mockResolvedValueOnce("success");
      const result = await withFallback({
        fn,
        endpoints: [testEndpoints.primary],
        retryCount: 2,
      });

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(3);
      expect(fn).toHaveBeenCalledWith(testEndpoints.primary);
    });

    it("should not retry when retryCount is 0", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("Network error"));
      await expect(
        withFallback({
          fn,
          endpoints: [testEndpoints.primary],
          retryCount: 0,
        })
      ).rejects.toThrow("Network error");

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should call onRetry callback with correct context", async () => {
      const fn = vi.fn().mockRejectedValueOnce(new Error("Network error")).mockResolvedValueOnce("success");
      const onRetry = vi.fn();
      const result = await withFallback({
        fn,
        endpoints: [testEndpoints.primary],
        retryCount: 1,
        onRetry,
      });

      expect(result).toBe("success");
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith({
        endpoint: testEndpoints.primary,
        retryCount: 1,
        fallbacks: [],
      });
    });

    it("should use custom shouldRetry function", async () => {
      const fn = vi.fn().mockRejectedValueOnce(new Error("Network error")).mockResolvedValueOnce("success");
      const shouldRetry = vi.fn().mockReturnValue(true);
      const result = await withFallback({
        fn,
        endpoints: [testEndpoints.primary],
        retryCount: 1,
        shouldRetry,
      });

      expect(result).toBe("success");
      expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error));
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("should not retry when custom shouldRetry returns false", async () => {
      const error = new Error("Network error");
      const fn = vi.fn().mockRejectedValue(error);
      const shouldRetry = vi.fn().mockReturnValue(false);
      await expect(
        withFallback({
          fn,
          endpoints: [testEndpoints.primary],
          retryCount: 2,
          shouldRetry,
        })
      ).rejects.toThrow("Network error");

      expect(shouldRetry).toHaveBeenCalledWith(error);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should call shouldRetry with undefined when successful", async () => {
      const fn = vi.fn().mockResolvedValue("success");
      const shouldRetry = vi.fn().mockReturnValue(false);
      const result = await withFallback({
        fn,
        endpoints: [testEndpoints.primary],
        retryCount: 2,
        shouldRetry,
      });

      expect(result).toBe("success");
      expect(shouldRetry).toHaveBeenCalledWith(undefined);
      expect(fn).toHaveBeenCalledTimes(1);
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
        retryCount: 0,
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
        retryCount: 0,
        onFallback,
      });

      expect(result).toBe("success");
      expect(onFallback).toHaveBeenCalledTimes(1);
      expect(onFallback).toHaveBeenCalledWith({
        endpoint: testEndpoints.primary,
        retryCount: 0,
        fallbacks: [testEndpoints.secondary],
      });
    });

    it("should use custom shouldFallback function", async () => {
      const fn = vi.fn().mockRejectedValueOnce(new Error("Network error")).mockResolvedValueOnce("success");
      const shouldFallback = vi.fn().mockReturnValue(true);
      const result = await withFallback({
        fn,
        endpoints: [testEndpoints.primary, testEndpoints.secondary],
        retryCount: 0,
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
          retryCount: 0,
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
        retryCount: 0,
        shouldFallback,
      });

      expect(result).toBe("success");
      expect(shouldFallback).toHaveBeenCalledWith(undefined);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should reject when all fallbacks are exhausted", async () => {
      const error = new Error("Network error");
      const fn = vi.fn().mockRejectedValue(error);
      await expect(
        withFallback({
          fn,
          endpoints: [testEndpoints.primary],
          retryCount: 0,
        })
      ).rejects.toThrow("Network error");

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe("combined retry and fallback", () => {
    it("should retry first, then fallback if retries exhausted", async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error("Error 1"))
        .mockRejectedValueOnce(new Error("Error 2"))
        .mockResolvedValueOnce("success");
      const result = await withFallback({
        fn,
        endpoints: [testEndpoints.primary, testEndpoints.secondary],
        retryCount: 1,
      });

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(3);
      expect(fn).toHaveBeenNthCalledWith(1, testEndpoints.primary);
      expect(fn).toHaveBeenNthCalledWith(2, testEndpoints.primary);
      expect(fn).toHaveBeenNthCalledWith(3, testEndpoints.secondary);
    });

    it("should reset retryCount to original value when falling back to new endpoint", async () => {
      const onFallback = vi.fn();
      const onRetry = vi.fn();
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error("Error 1"))
        .mockRejectedValueOnce(new Error("Error 2"))
        .mockRejectedValueOnce(new Error("Error 3"))
        .mockRejectedValueOnce(new Error("Error 4"))
        .mockRejectedValueOnce(new Error("Error 5"))
        .mockResolvedValueOnce("success");
      const result = await withFallback({
        fn,
        endpoints: [testEndpoints.primary, testEndpoints.secondary],
        retryCount: 2,
        onFallback,
        onRetry,
      });

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(6);
      expect(fn).toHaveBeenNthCalledWith(1, testEndpoints.primary);
      expect(fn).toHaveBeenNthCalledWith(2, testEndpoints.primary);
      expect(fn).toHaveBeenNthCalledWith(3, testEndpoints.primary);
      expect(fn).toHaveBeenNthCalledWith(4, testEndpoints.secondary);
      expect(fn).toHaveBeenNthCalledWith(5, testEndpoints.secondary);
      expect(fn).toHaveBeenNthCalledWith(6, testEndpoints.secondary);
      expect(onFallback).toHaveBeenCalledWith({
        endpoint: testEndpoints.primary,
        retryCount: 0,
        fallbacks: [testEndpoints.secondary],
      });
      expect(onRetry).toHaveBeenCalledTimes(4);
      expect(onRetry).toHaveBeenNthCalledWith(3, {
        endpoint: testEndpoints.secondary,
        retryCount: 2,
        fallbacks: [],
      });
      expect(onRetry).toHaveBeenNthCalledWith(4, {
        endpoint: testEndpoints.secondary,
        retryCount: 1,
        fallbacks: [],
      });
    });

    it("should call both onRetry and onFallback callbacks", async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error("Error 1"))
        .mockRejectedValueOnce(new Error("Error 2"))
        .mockResolvedValueOnce("success");
      const onRetry = vi.fn();
      const onFallback = vi.fn();
      const result = await withFallback({
        fn,
        endpoints: [testEndpoints.primary, testEndpoints.secondary],
        retryCount: 1,
        onRetry,
        onFallback,
      });

      expect(result).toBe("success");
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith({
        endpoint: testEndpoints.primary,
        retryCount: 1,
        fallbacks: [testEndpoints.secondary],
      });
      expect(onFallback).toHaveBeenCalledTimes(1);
      expect(onFallback).toHaveBeenCalledWith({
        endpoint: testEndpoints.primary,
        retryCount: 0,
        fallbacks: [testEndpoints.secondary],
      });
    });

    it("should reset retryCount on each fallback to next endpoint", async () => {
      const onFallback = vi.fn();
      const onRetry = vi.fn();
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error("Error 1"))
        .mockRejectedValueOnce(new Error("Error 2"))
        .mockRejectedValueOnce(new Error("Error 3"))
        .mockRejectedValueOnce(new Error("Error 4"))
        .mockRejectedValueOnce(new Error("Error 5"))
        .mockResolvedValueOnce("success");
      const result = await withFallback({
        fn,
        endpoints: [testEndpoints.primary, testEndpoints.secondary, testEndpoints.fallback],
        retryCount: 1,
        onFallback,
        onRetry,
      });

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(6);
      expect(onFallback).toHaveBeenCalledTimes(2);
      expect(onFallback).toHaveBeenNthCalledWith(1, {
        endpoint: testEndpoints.primary,
        retryCount: 0,
        fallbacks: [testEndpoints.secondary, testEndpoints.fallback],
      });
      expect(onFallback).toHaveBeenNthCalledWith(2, {
        endpoint: testEndpoints.secondary,
        retryCount: 0,
        fallbacks: [testEndpoints.fallback],
      });
      expect(onRetry).toHaveBeenCalledTimes(3);
      expect(onRetry).toHaveBeenNthCalledWith(2, {
        endpoint: testEndpoints.secondary,
        retryCount: 1,
        fallbacks: [testEndpoints.fallback],
      });
      expect(onRetry).toHaveBeenNthCalledWith(3, {
        endpoint: testEndpoints.fallback,
        retryCount: 1,
        fallbacks: [],
      });
    });
  });

  describe("error handling", () => {
    it("should reject when all retries and fallbacks are exhausted", async () => {
      const error1 = new Error("Error 1");
      const error2 = new Error("Error 2");
      const fnWithRetries = vi.fn().mockRejectedValue(error1);
      await expect(
        withFallback({
          fn: fnWithRetries,
          endpoints: [testEndpoints.primary],
          retryCount: 2,
        })
      ).rejects.toThrow("Error 1");
      expect(fnWithRetries).toHaveBeenCalledTimes(3);

      const fnWithFallbacks = vi.fn().mockRejectedValueOnce(error1).mockRejectedValueOnce(error2);
      await expect(
        withFallback({
          fn: fnWithFallbacks,
          endpoints: [testEndpoints.primary, testEndpoints.secondary],
          retryCount: 0,
        })
      ).rejects.toThrow("Error 2");
      expect(fnWithFallbacks).toHaveBeenCalledTimes(2);
    });
  });

  describe("custom predicates", () => {
    it("should call predicates with undefined when result is successful", async () => {
      const fn = vi.fn().mockResolvedValue("success");
      const shouldRetry = vi.fn().mockReturnValue(false);
      const shouldFallback = vi.fn().mockReturnValue(false);

      const result1 = await withFallback({
        fn,
        endpoints: [testEndpoints.primary],
        retryCount: 1,
        shouldRetry,
      });
      expect(result1).toBe("success");
      expect(shouldRetry).toHaveBeenCalledWith(undefined);
      expect(fn).toHaveBeenCalledTimes(1);

      fn.mockClear();
      shouldRetry.mockClear();

      const result2 = await withFallback({
        fn,
        endpoints: [testEndpoints.primary, testEndpoints.secondary],
        retryCount: 0,
        shouldFallback,
      });
      expect(result2).toBe("success");
      expect(shouldFallback).toHaveBeenCalledWith(undefined);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should prioritize retry over fallback when both conditions are met", async () => {
      const fn = vi.fn().mockRejectedValueOnce(new Error("Error")).mockResolvedValueOnce("success");
      const shouldRetry = vi.fn().mockImplementation((error?: Error) => Boolean(error));
      const shouldFallback = vi.fn().mockImplementation((error?: Error) => Boolean(error));
      const result = await withFallback({
        fn,
        endpoints: [testEndpoints.primary, testEndpoints.secondary],
        retryCount: 1,
        shouldRetry,
        shouldFallback,
      });

      expect(result).toBe("success");
      expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error));
      expect(shouldFallback).toHaveBeenCalledWith(undefined);
      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenNthCalledWith(1, testEndpoints.primary);
      expect(fn).toHaveBeenNthCalledWith(2, testEndpoints.primary);
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
        retryCount: 0,
        onFallback,
      });

      expect(result).toBe("success");
      expect(onFallback).toHaveBeenCalledTimes(2);
      expect(onFallback).toHaveBeenNthCalledWith(1, {
        endpoint: testEndpoints.primary,
        retryCount: 0,
        fallbacks: [testEndpoints.secondary, testEndpoints.fallback],
      });
      expect(onFallback).toHaveBeenNthCalledWith(2, {
        endpoint: testEndpoints.secondary,
        retryCount: 0,
        fallbacks: [testEndpoints.fallback],
      });
    });

    it("should track correct retryCount in context during retries", async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error("Error 1"))
        .mockRejectedValueOnce(new Error("Error 2"))
        .mockResolvedValueOnce("success");
      const onRetry = vi.fn();
      const result = await withFallback({
        fn,
        endpoints: [testEndpoints.primary],
        retryCount: 2,
        onRetry,
      });

      expect(result).toBe("success");
      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenNthCalledWith(1, {
        endpoint: testEndpoints.primary,
        retryCount: 2,
        fallbacks: [],
      });
      expect(onRetry).toHaveBeenNthCalledWith(2, {
        endpoint: testEndpoints.primary,
        retryCount: 1,
        fallbacks: [],
      });
    });
  });

  describe("stack overflow protection", () => {
    it("should validate retryCount is non-negative", () => {
      const fn = vi.fn().mockResolvedValue("success");
      expect(() => {
        withFallback({
          fn,
          endpoints: [testEndpoints.primary],
          retryCount: -1,
        });
      }).toThrow("retryCount must be >= 0");
    });

    it("should validate at least one endpoint is provided", () => {
      const fn = vi.fn().mockResolvedValue("success");
      expect(() => {
        withFallback({
          fn,
          endpoints: [],
          retryCount: 1,
        });
      }).toThrow("At least one endpoint is required");
    });

    it("should stop recursion and return error from last request when depth limit exceeded", async () => {
      const lastError = new Error("Last request error");
      const fn = vi.fn().mockRejectedValue(lastError);
      const manyEndpoints = Array(200).fill(testEndpoints.primary);
      await expect(
        withFallback({
          fn,
          endpoints: manyEndpoints,
          retryCount: 10,
        })
      ).rejects.toThrow("Last request error");
      expect(fn).toHaveBeenCalled();
    });

    it("should allow reasonable retryCount × endpoints combinations", () => {
      const fn = vi.fn().mockResolvedValue("success");
      const endpoints = Array(10).fill(testEndpoints.primary);
      expect(() => {
        withFallback({
          fn,
          endpoints,
          retryCount: 10,
        });
      }).not.toThrow();
    });

    it("should prevent infinite recursion with malicious predicates", async () => {
      const error = new Error("Always fails");
      const fn1 = vi.fn().mockRejectedValue(error);
      const shouldRetry = vi.fn().mockReturnValue(true);
      await expect(
        withFallback({
          fn: fn1,
          endpoints: [testEndpoints.primary],
          retryCount: 5,
          shouldRetry,
        })
      ).rejects.toThrow("Always fails");
      expect(fn1).toHaveBeenCalledTimes(6);

      const fn2 = vi.fn().mockRejectedValue(error);
      const shouldFallback = vi.fn().mockReturnValue(true);
      await expect(
        withFallback({
          fn: fn2,
          endpoints: [testEndpoints.primary, testEndpoints.secondary],
          retryCount: 0,
          shouldFallback,
        })
      ).rejects.toThrow("Always fails");
      expect(fn2).toHaveBeenCalledTimes(2);
    });
  });
});
