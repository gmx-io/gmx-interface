import { describe, expect, it } from "vitest";

import type { CheckResult } from "../FallbackTracker";
import { scoreBySpeedAndConsistency } from "../utils";
import { createMockEndpointStats, testEndpoints, TestCheckResult } from "./_utils";

const createMockCheckResult = (success: boolean, responseTime?: number): CheckResult<TestCheckResult> => ({
  endpoint: testEndpoints.endpoint1,
  success,
  stats: success && responseTime !== undefined ? { responseTime, isValid: true } : undefined,
});

describe("scoreBySpeedAndConsistency", () => {
  describe("edge cases", () => {
    it("should return 0 when avgResponseTime is 0", () => {
      const scoreFn = scoreBySpeedAndConsistency(0);
      const stats = createMockEndpointStats<TestCheckResult>({
        checkResults: [createMockCheckResult(true, 100), createMockCheckResult(true, 200)] as any,
      });

      expect(scoreFn(stats)).toBe(0);
    });

    it("should return 0 when totalChecks is 0", () => {
      const scoreFn = scoreBySpeedAndConsistency(100);
      const stats = createMockEndpointStats<TestCheckResult>({
        checkResults: [],
      });

      expect(scoreFn(stats)).toBe(0);
    });

    it("should calculate score even when avgResponseTime is negative (isNonZero returns true)", () => {
      const scoreFn = scoreBySpeedAndConsistency(-10);
      const stats = createMockEndpointStats<TestCheckResult>({
        checkResults: [createMockCheckResult(true, 100)] as any,
      });

      const score = scoreFn(stats);
      expect(score).toBeGreaterThan(0);
      const endpointAvgTime = 100;
      const speedScore = Math.exp(-endpointAvgTime / -10);
      const expectedScore = 0.7 * 1.0 + 0.5 * speedScore;
      expect(score).toBeCloseTo(expectedScore, 5);
    });
  });

  describe("stability score calculation", () => {
    it("should return high score when all checks are successful", () => {
      const avgResponseTime = 100;
      const scoreFn = scoreBySpeedAndConsistency(avgResponseTime);
      const stats = createMockEndpointStats<TestCheckResult>({
        checkResults: [
          createMockCheckResult(true, 50),
          createMockCheckResult(true, 60),
          createMockCheckResult(true, 70),
        ] as any,
      });

      const score = scoreFn(stats);
      expect(score).toBeGreaterThan(0);
      const stabilityScore = 1.0;
      const expectedMinScore = 0.7 * stabilityScore;
      expect(score).toBeGreaterThanOrEqual(expectedMinScore);
    });

    it("should return lower score when some checks fail", () => {
      const avgResponseTime = 100;
      const scoreFn = scoreBySpeedAndConsistency(avgResponseTime);
      const stats = createMockEndpointStats<TestCheckResult>({
        checkResults: [
          createMockCheckResult(true, 50),
          createMockCheckResult(false),
          createMockCheckResult(true, 60),
        ] as any,
      });

      const score = scoreFn(stats);
      expect(score).toBeGreaterThan(0);
      const stabilityScore = 2 / 3;
      const expectedMinScore = 0.7 * stabilityScore;
      expect(score).toBeGreaterThanOrEqual(expectedMinScore);
    });

    it("should return 0 when all checks fail (no speed data available)", () => {
      const avgResponseTime = 100;
      const scoreFn = scoreBySpeedAndConsistency(avgResponseTime);
      const stats = createMockEndpointStats<TestCheckResult>({
        checkResults: [createMockCheckResult(false), createMockCheckResult(false), createMockCheckResult(false)] as any,
      });

      const score = scoreFn(stats);
      expect(score).toBe(0);
    });

    it("should handle mixed success/failure correctly", () => {
      const avgResponseTime = 100;
      const scoreFn = scoreBySpeedAndConsistency(avgResponseTime);
      const stats = createMockEndpointStats<TestCheckResult>({
        checkResults: [
          createMockCheckResult(true, 50),
          createMockCheckResult(true, 60),
          createMockCheckResult(false),
          createMockCheckResult(false),
        ] as any,
      });

      const score = scoreFn(stats);
      expect(score).toBeGreaterThan(0);
      const stabilityScore = 0.5;
      const expectedMinScore = 0.7 * stabilityScore;
      expect(score).toBeGreaterThanOrEqual(expectedMinScore);
    });
  });

  describe("speed score calculation", () => {
    it("should return higher score for faster response times", () => {
      const avgResponseTime = 100;
      const scoreFn = scoreBySpeedAndConsistency(avgResponseTime);

      const fastStats = createMockEndpointStats<TestCheckResult>({
        checkResults: [createMockCheckResult(true, 20), createMockCheckResult(true, 30)] as any,
      });

      const slowStats = createMockEndpointStats<TestCheckResult>({
        checkResults: [createMockCheckResult(true, 180), createMockCheckResult(true, 200)] as any,
      });

      const fastScore = scoreFn(fastStats);
      const slowScore = scoreFn(slowStats);

      expect(fastScore).toBeGreaterThan(slowScore);
    });

    it("should handle response time equal to average", () => {
      const avgResponseTime = 100;
      const scoreFn = scoreBySpeedAndConsistency(avgResponseTime);
      const stats = createMockEndpointStats<TestCheckResult>({
        checkResults: [createMockCheckResult(true, 100), createMockCheckResult(true, 100)] as any,
      });

      const score = scoreFn(stats);
      expect(score).toBeGreaterThan(0);
      const speedScore = Math.exp(-1);
      const expectedScore = 0.7 * 1.0 + 0.5 * speedScore;
      expect(score).toBeCloseTo(expectedScore, 5);
    });

    it("should use 0 for responseTime when stats is undefined", () => {
      const avgResponseTime = 100;
      const scoreFn = scoreBySpeedAndConsistency(avgResponseTime);
      const stats = createMockEndpointStats<TestCheckResult>({
        checkResults: [
          {
            endpoint: testEndpoints.endpoint1,
            success: true,
            stats: undefined,
          },
          {
            endpoint: testEndpoints.endpoint1,
            success: true,
            stats: undefined,
          },
        ] as any,
      });

      const score = scoreFn(stats);
      expect(score).toBeGreaterThan(0);
      const endpointAvgTime = 0;
      const speedScore = Math.exp(-endpointAvgTime / avgResponseTime);
      const expectedScore = 0.7 * 1.0 + 0.5 * speedScore;
      expect(score).toBeCloseTo(expectedScore, 5);
    });
  });

  describe("combined score calculation", () => {
    it("should weight stability more than speed", () => {
      const avgResponseTime = 100;
      const scoreFn = scoreBySpeedAndConsistency(avgResponseTime);

      const highStabilitySlowSpeed = createMockEndpointStats<TestCheckResult>({
        checkResults: [createMockCheckResult(true, 200), createMockCheckResult(true, 200)] as any,
      });

      const lowStabilityFastSpeed = createMockEndpointStats<TestCheckResult>({
        checkResults: [createMockCheckResult(true, 20), createMockCheckResult(false)] as any,
      });

      const highStabilityScore = scoreFn(highStabilitySlowSpeed);
      const lowStabilityScore = scoreFn(lowStabilityFastSpeed);

      expect(highStabilityScore).toBeGreaterThan(lowStabilityScore);
    });
  });

  describe("real-world scenarios", () => {
    it("should rank endpoints correctly by combined score", () => {
      const avgResponseTime = 100;
      const scoreFn = scoreBySpeedAndConsistency(avgResponseTime);

      const endpoint1 = createMockEndpointStats<TestCheckResult>({
        endpoint: "endpoint1",
        checkResults: [
          createMockCheckResult(true, 50),
          createMockCheckResult(true, 60),
          createMockCheckResult(true, 55),
        ] as any,
      });

      const endpoint2 = createMockEndpointStats<TestCheckResult>({
        endpoint: "endpoint2",
        checkResults: [
          createMockCheckResult(true, 80),
          createMockCheckResult(true, 90),
          createMockCheckResult(false),
        ] as any,
      });

      const endpoint3 = createMockEndpointStats<TestCheckResult>({
        endpoint: "endpoint3",
        checkResults: [
          createMockCheckResult(true, 120),
          createMockCheckResult(true, 130),
          createMockCheckResult(true, 125),
        ] as any,
      });

      const score1 = scoreFn(endpoint1);
      const score2 = scoreFn(endpoint2);
      const score3 = scoreFn(endpoint3);

      expect(score1).toBeGreaterThan(score3);
      expect(score3).toBeGreaterThan(score2);
    });
  });
});
