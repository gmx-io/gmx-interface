import { describe, expect, it } from "vitest";

import { ARBITRUM, AVALANCHE, getExecutionFeePriorityFeeAllowance, getGasPricePremium } from "config/chains";
import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { getContract } from "sdk/configs/contracts";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";
import { BatchOrderTxnParams, getExpressBatchOrderParams } from "sdk/utils/orderTransactions";

import {
  getMinimumExecutionFeeBufferBps,
  estimateExecutionGasPrice,
  getExecutionFeeGasPricePremium,
  getExpressExecutionFeeAmount,
  getExpressGasPrice,
} from "../../fees/utils/executionFee";

const PREMIUM = 3000000000n / 30n;
const BASE_GAS_PRICE = 1000000001n;
const MAX_PRIORITY_FEE_PER_GAS = 1500000000n;
const GAS_LIMIT = 6100000n;
const CURRENT_BUFFER_BPS = 1000n;

const baseMinBufferParams = {
  currentBufferBps: CURRENT_BUFFER_BPS,
  estimatedExecutionGasLimit: GAS_LIMIT,
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
        const initialExecutionFee = initialGasPrice * params.minBufferParams.estimatedExecutionGasLimit;

        expect(initialExecutionFee).toBeLessThan(params.minBufferParams.minExecutionFee);

        const requiredBufferBps = getMinimumExecutionFeeBufferBps({
          ...params.minBufferParams,
          // a single order: the contract reports the whole estimate
          executionFee: params.minBufferParams.estimatedExecutionFee,
        });

        const newGasPrice = estimateExecutionGasPrice({
          ...params.gasParams,
          bufferBps: requiredBufferBps,
        });

        const newExecutionFee = newGasPrice * params.minBufferParams.estimatedExecutionGasLimit;
        const newDelta = newExecutionFee - params.minBufferParams.minExecutionFee;
        const newDeltaBps = (newDelta * BASIS_POINTS_DIVISOR_BIGINT) / params.minBufferParams.minExecutionFee;

        if (requiredBufferBps === undefined) {
          throw new Error(`Required buffer bps is undefined`);
        }

        expect(requiredBufferBps / 100n).toBe(params.expectedBufferBps / 100n);
        expect(newExecutionFee).toBe(params.expectedExecutionFee);
        // <1% deviation
        expect(bigMath.abs(newDeltaBps)).toBeLessThan(100n);
      });
    });
  });
});

describe("getExecutionFeeGasPricePremium", () => {
  it("covers the wallet priority fee on Arbitrum for wallet-signed transactions only", () => {
    expect(getExecutionFeePriorityFeeAllowance(ARBITRUM)).toBe(30000000n);
    expect(getExecutionFeeGasPricePremium(ARBITRUM, false)).toBe(30000000n);
    expect(getExecutionFeeGasPricePremium(ARBITRUM, true)).toBe(0n);
  });

  it("takes the allowance out of the wallet gas price for express", () => {
    expect(getExpressGasPrice(ARBITRUM, 56000000n)).toBe(26000000n);
    expect(getExpressGasPrice(ARBITRUM, 10000000n)).toBe(0n);
    expect(getExpressGasPrice(AVALANCHE, 56000000n)).toBe(56000000n);
  });

  it("takes the allowance out of a single estimate for express", () => {
    const executionFee = { feeTokenAmount: 56000000n * 3000000n, gasLimit: 3000000n } as any;

    expect(getExpressExecutionFeeAmount(ARBITRUM, executionFee)).toBe(26000000n * 3000000n);
    expect(getExpressExecutionFeeAmount(AVALANCHE, executionFee)).toBe(56000000n * 3000000n);
  });

  it("keeps the chain premium elsewhere", () => {
    expect(getExecutionFeePriorityFeeAllowance(AVALANCHE)).toBe(0n);
    expect(getExecutionFeeGasPricePremium(AVALANCHE, false)).toBe(getGasPricePremium(AVALANCHE));
    expect(getExecutionFeeGasPricePremium(AVALANCHE, true)).toBe(getGasPricePremium(AVALANCHE));
  });

  it("is added on top of the buffered gas price", () => {
    const gasPrice = estimateExecutionGasPrice({
      rawGasPrice: 20000000n,
      maxPriorityFeePerGas: undefined,
      bufferBps: 3000n,
      premium: getExecutionFeeGasPricePremium(ARBITRUM, false),
    });

    // 0.02 gwei × 1.3 + 0.03 gwei
    expect(gasPrice).toBe(56000000n);
  });
});

describe("getMinimumExecutionFeeBufferBps with the Arbitrum allowance", () => {
  // base fee 0.02 gwei, buffer 30%, allowance 0.03 gwei: the estimate budgets 0.056 gwei
  const gasPrice = 56000000n;
  const premium = 30000000n;
  const orderGasLimit = 3000000n;
  const orderExecutionFee = gasPrice * orderGasLimit;
  // the wallet paid 0.06 gwei (a 0.04 gwei tip), so the contract wanted 0.06 gwei × gas limit
  const minExecutionFee = 60000000n * orderGasLimit;

  it("suggests the buffer that covers the tip above the allowance", () => {
    const requiredBufferBps = getMinimumExecutionFeeBufferBps({
      minExecutionFee,
      executionFee: orderExecutionFee,
      estimatedExecutionFee: orderExecutionFee,
      estimatedExecutionGasLimit: orderGasLimit,
      currentBufferBps: 3000n,
      premium,
    });

    // (0.06 - 0.03) / 0.02 - 1 = 50%, plus 5% for safety
    expect(requiredBufferBps).toBe(5500n);
  });

  it("gives the same suggestion for an order failing inside a batch", () => {
    const requiredBufferBps = getMinimumExecutionFeeBufferBps({
      minExecutionFee,
      executionFee: orderExecutionFee,
      // two equal orders in the batch: the estimate covers both
      estimatedExecutionFee: orderExecutionFee * 2n,
      estimatedExecutionGasLimit: orderGasLimit * 2n,
      currentBufferBps: 3000n,
      premium,
    });

    expect(requiredBufferBps).toBe(5500n);
  });

  it("takes the reported order's own gas limit in a mixed batch", () => {
    const tpSlGasLimit = 2000000n;
    const topUp = 1000000000000n;
    const requiredBufferBps = getMinimumExecutionFeeBufferBps({
      minExecutionFee,
      executionFee: orderExecutionFee,
      // the increase order, an attached TP/SL order and an update top-up without a gas limit
      estimatedExecutionFee: orderExecutionFee + gasPrice * tpSlGasLimit + topUp,
      estimatedExecutionGasLimit: orderGasLimit + tpSlGasLimit,
      estimatedOrders: [
        { executionFee: orderExecutionFee, gasLimit: orderGasLimit },
        { executionFee: gasPrice * tpSlGasLimit, gasLimit: tpSlGasLimit },
      ],
      currentBufferBps: 3000n,
      premium,
    });

    expect(requiredBufferBps).toBe(5500n);
  });

  it("has no suggestion without the estimate", () => {
    expect(
      getMinimumExecutionFeeBufferBps({
        minExecutionFee,
        executionFee: orderExecutionFee,
        estimatedExecutionFee: undefined,
        estimatedExecutionGasLimit: undefined,
        currentBufferBps: 3000n,
        premium,
      })
    ).toBeUndefined();
  });
});

describe("getExpressBatchOrderParams", () => {
  const orderVault = getContract(ARBITRUM, "OrderVault");
  const usdc = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  const executionGasLimit = 3000000n;
  // 0.056 gwei × gas limit: the wallet budget with the 0.03 gwei allowance
  const executionFee = 56000000n * executionGasLimit;
  const payAmount = 500000000n;

  function makeBatch(): BatchOrderTxnParams {
    return {
      createOrderParams: [
        {
          params: { executionGasLimit, executionFeeAmount: executionFee } as any,
          orderPayload: { numbers: { executionFee, sizeDeltaUsd: 1n } } as any,
          tokenTransfersParams: {
            value: executionFee,
            tokenTransfers: [
              { tokenAddress: NATIVE_TOKEN_ADDRESS, destination: orderVault, amount: executionFee },
              { tokenAddress: usdc, destination: orderVault, amount: payAmount },
            ],
          } as any,
        },
      ],
      updateOrderParams: [],
      cancelOrderParams: [],
    };
  }

  it("takes the allowance out of every order, its native transfer and the value", () => {
    const expressBatch = getExpressBatchOrderParams(ARBITRUM, makeBatch());
    const [order] = expressBatch.createOrderParams;
    const expectedFee = 26000000n * executionGasLimit;

    expect(order.params.executionFeeAmount).toBe(expectedFee);
    expect(order.orderPayload.numbers.executionFee).toBe(expectedFee);
    expect(order.tokenTransfersParams?.value).toBe(expectedFee);
    expect(order.tokenTransfersParams?.tokenTransfers).toEqual([
      { tokenAddress: NATIVE_TOKEN_ADDRESS, destination: orderVault, amount: expectedFee },
      { tokenAddress: usdc, destination: orderVault, amount: payAmount },
    ]);
  });

  it("leaves the original batch untouched", () => {
    const batch = makeBatch();
    getExpressBatchOrderParams(ARBITRUM, batch);

    expect(batch.createOrderParams[0].orderPayload.numbers.executionFee).toBe(executionFee);
    expect(batch.createOrderParams[0].tokenTransfersParams?.value).toBe(executionFee);
  });

  it("is a no-op where there is no allowance", () => {
    const batch = makeBatch();

    expect(getExpressBatchOrderParams(AVALANCHE, batch)).toBe(batch);
  });

  it("leaves an order without a gas limit as it is", () => {
    const batch = makeBatch();
    batch.createOrderParams[0].params.executionGasLimit = 0n;

    expect(getExpressBatchOrderParams(ARBITRUM, batch).createOrderParams[0].orderPayload.numbers.executionFee).toBe(
      executionFee
    );
  });

  it("takes the allowance out of an update top-up, but not below zero", () => {
    const makeUpdate = (executionFeeTopUp: bigint, executionGasLimit: bigint | undefined) =>
      ({
        params: { executionFeeTopUp, executionGasLimit } as any,
        updatePayload: { executionFeeTopUp } as any,
      }) as BatchOrderTxnParams["updateOrderParams"][number];
    const batch: BatchOrderTxnParams = {
      createOrderParams: [],
      updateOrderParams: [
        makeUpdate(90000000000000n, executionGasLimit),
        makeUpdate(10000000000000n, executionGasLimit),
        makeUpdate(10000000000000n, undefined),
      ],
      cancelOrderParams: [],
    };

    const [covered, small, unknown] = getExpressBatchOrderParams(ARBITRUM, batch).updateOrderParams;

    // 0.03 gwei × 3M gas = 0.00009 ETH comes out of the top-up
    expect(covered.updatePayload.executionFeeTopUp).toBe(0n);
    expect(covered.params.executionFeeTopUp).toBe(0n);
    expect(small.updatePayload.executionFeeTopUp).toBe(0n);
    expect(unknown.updatePayload.executionFeeTopUp).toBe(10000000000000n);
  });
});
