// @vitest-shared-worker
import { describe, expect, it } from "vitest";

import type { ExpressTxnParams } from "domain/synthetics/express";
import { getEmptyExternalCallsPayload } from "sdk/utils/orderTransactions";

import { getMatchingExpressParamsPromise } from "../useRelayerFeeHandler";

const NO_EXTERNAL_CALLS = getEmptyExternalCallsPayload();

function makeExpressParams(isGmxAccount: boolean): ExpressTxnParams {
  return { isGmxAccount, relayParamsPayload: { externalCalls: NO_EXTERNAL_CALLS } } as ExpressTxnParams;
}

describe("getMatchingExpressParamsPromise", () => {
  it("ignores the params the disabled estimateGas estimator still holds after the approximate estimate failed", async () => {
    // the form shows a Classic transaction in this state, so the submit must not pick up the stale Express params
    const staleAsyncParams = makeExpressParams(false);

    await expect(
      getMatchingExpressParamsPromise({
        fastExpressPromise: undefined,
        asyncExpressPromise: Promise.resolve(staleAsyncParams),
        isAsyncEnabled: false,
        isGmxAccount: false,
        batchExternalCalls: NO_EXTERNAL_CALLS,
      })
    ).resolves.toBeUndefined();
  });

  it("skips an estimate made for the other balance and waits for the one made for this balance", async () => {
    const otherSourceParams = makeExpressParams(true);
    const sameSourceParams = makeExpressParams(false);

    await expect(
      getMatchingExpressParamsPromise({
        fastExpressPromise: Promise.resolve(otherSourceParams),
        asyncExpressPromise: new Promise((resolve) => setTimeout(() => resolve(sameSourceParams), 10)),
        isAsyncEnabled: true,
        isGmxAccount: false,
        batchExternalCalls: NO_EXTERNAL_CALLS,
      })
    ).resolves.toBe(sameSourceParams);
  });

  it("resolves with the first estimate made for this balance", async () => {
    const fastParams = makeExpressParams(true);
    const asyncParams = makeExpressParams(true);

    await expect(
      getMatchingExpressParamsPromise({
        fastExpressPromise: Promise.resolve(fastParams),
        asyncExpressPromise: new Promise((resolve) => setTimeout(() => resolve(asyncParams), 10)),
        isAsyncEnabled: true,
        isGmxAccount: true,
        batchExternalCalls: NO_EXTERNAL_CALLS,
      })
    ).resolves.toBe(fastParams);
  });

  it("resolves with nothing when every estimate failed or belongs to the other balance", async () => {
    await expect(
      getMatchingExpressParamsPromise({
        fastExpressPromise: Promise.reject(new Error("estimate failed")),
        asyncExpressPromise: Promise.resolve(makeExpressParams(true)),
        isAsyncEnabled: true,
        isGmxAccount: false,
        batchExternalCalls: NO_EXTERNAL_CALLS,
      })
    ).resolves.toBeUndefined();
  });
});
