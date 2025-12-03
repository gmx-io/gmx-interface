import { vi } from "vitest";

import { DEFAULT_FALLBACK_TRACKER_CONFIG } from "../FallbackTracker";
import type { CheckResult, FallbackTrackerParams } from "../FallbackTracker";

export const testEndpoints = {
  primary: "https://primary.com",
  secondary: "https://secondary.com",
  fallback: "https://fallback.com",
  invalid: "https://invalid.com",
  endpoint1: "https://endpoint1.com",
} as const;

export type TestCheckResult = {
  responseTime: number;
  isValid: boolean;
};

export const createMockCheckResult = (
  overrides?: Partial<CheckResult<TestCheckResult>>
): CheckResult<TestCheckResult> => ({
  endpoint: testEndpoints.endpoint1,
  success: true,
  stats: { responseTime: 100, isValid: true },
  ...overrides,
});

export const createMockConfig = (
  overrides?: Partial<FallbackTrackerParams<TestCheckResult>>
): FallbackTrackerParams<TestCheckResult> => {
  const config: FallbackTrackerParams<TestCheckResult> = {
    ...DEFAULT_FALLBACK_TRACKER_CONFIG,
    trackerKey: "test.tracker",
    primary: testEndpoints.primary,
    endpoints: [testEndpoints.primary, testEndpoints.secondary, testEndpoints.fallback],
    checkEndpoint: vi.fn().mockImplementation(async (endpoint: string, signal: AbortSignal) => {
      // Handle abort signal
      if (signal.aborted) {
        const abortError = new Error("Aborted");
        abortError.name = "AbortError";
        throw abortError;
      }
      // Default successful response
      return { responseTime: 100, isValid: true };
    }),
    selectNextPrimary: vi.fn().mockImplementation(() => {
      // Default: return undefined to keep current primary
      return undefined;
    }),
    selectNextFallbacks: vi.fn().mockImplementation(() => {
      // Default: return undefined to keep current fallbacks
      return undefined;
    }),
  };

  if (overrides) {
    // Deep merge for failuresBeforeBan
    if (overrides.failuresBeforeBan) {
      config.failuresBeforeBan = { ...config.failuresBeforeBan, ...overrides.failuresBeforeBan };
    }
    // Merge other overrides (excluding failuresBeforeBan to avoid overwriting the merged value)
    const { failuresBeforeBan: _failuresBeforeBan, ...restOverrides } = overrides;
    Object.assign(config, restOverrides);
  }

  return config;
};
