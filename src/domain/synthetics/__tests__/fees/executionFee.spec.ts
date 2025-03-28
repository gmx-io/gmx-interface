import { describe, expect, it } from "vitest";

import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { bigMath } from "sdk/utils/bigmath";

import { getMinimumExecutionFeeBufferBps, estimateExecutionGasPrice } from "../../fees/utils/executionFee";

const PREMIUM = 3000000000n / 30n;
const BASE_GAS_PRICE = 1000000001n;
const MAX_PRIORITY_FEE_PER_GAS = 1500000000n;
const GAS_LIMIT = 6100000n;
const CURRENT_BUFFER_BPS = 1000n;

const baseMinBufferParams = {
  currentBufferBps: CURRENT_BUFFER_BPS,
  gasLimit: GAS_LIMIT,
  premium: PREMIUM,
};

const baseGasParams = {
  bufferBps: CURRENT_BUFFER_BPS,
  rawGasPrice: BASE_GAS_PRICE,
  maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
  premium: PREMIUM,
};

describe("getMinimumExecutionFeeBufferBps", () => {
  describe("validates that new buffer produces sufficient execution fee", () => {
    const testCases = [
      {
        minBufferParams: {
          ...baseMinBufferParams,
          minExecutionFee: 24400000000000000n,
          estimatedExecutionFee: 17995000006100000n,
        },
        gasParams: baseGasParams,
        expectedBufferBps: 5500n,
        expectedExecutionFee: 24326800006100000n,
      },
      {
        minBufferParams: {
          ...baseMinBufferParams,
          minExecutionFee: 18300000000000000n,
          estimatedExecutionFee: 16775000006100000n,
          currentBufferBps: 200n,
        },
        gasParams: {
          ...baseGasParams,
          bufferBps: 200n,
        },
        expectedBufferBps: 1600n,
        expectedExecutionFee: 18394550006100000n,
      },
      {
        minBufferParams: {
          ...baseMinBufferParams,
          minExecutionFee: 82350000000000000n,
          estimatedExecutionFee: 17690000006100000n,
          currentBufferBps: 1600n,
          premium: 0n,
        },
        gasParams: {
          ...baseGasParams,
          bufferBps: 1600n,
          premium: 0n,
        },
        expectedBufferBps: 44500n,
        expectedExecutionFee: 83112500030500000n,
      },
    ];

    testCases.forEach((params) => {
      it(`excected buffer bps: ${params.expectedBufferBps}`, () => {
        const initialGasPrice = estimateExecutionGasPrice(params.gasParams);
        const initialExecutionFee = initialGasPrice * params.minBufferParams.gasLimit;

        expect(initialExecutionFee).toBeLessThan(params.minBufferParams.minExecutionFee);

        const requiredBufferBps = getMinimumExecutionFeeBufferBps(params.minBufferParams);

        const newGasPrice = estimateExecutionGasPrice({
          ...params.gasParams,
          bufferBps: requiredBufferBps,
        });

        const newExecutionFee = newGasPrice * params.minBufferParams.gasLimit;
        const newDelta = newExecutionFee - params.minBufferParams.minExecutionFee;
        const newDeltaBps = (newDelta * BASIS_POINTS_DIVISOR_BIGINT) / params.minBufferParams.minExecutionFee;

        expect(requiredBufferBps / 100n).toBe(params.expectedBufferBps / 100n);
        expect(newExecutionFee).toBe(params.expectedExecutionFee);
        // <1% deviation
        expect(bigMath.abs(newDeltaBps)).toBeLessThan(100n);
      });
    });
  });
});
