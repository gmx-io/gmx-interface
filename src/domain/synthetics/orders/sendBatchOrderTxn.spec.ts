import { describe, expect, it } from "vitest";

import type { ExpressTxnParams } from "domain/synthetics/express";

import { assertExpressParams } from "./sendBatchOrderTxn";

const EXPRESS_PARAMS = {} as ExpressTxnParams;

describe("assertExpressParams", () => {
  it("prevents an Express intent from falling through to a wallet transaction", () => {
    expect(() =>
      assertExpressParams({
        expressParams: undefined,
        isGmxAccount: false,
        requireExpress: true,
      })
    ).toThrow("Express parameters are required for the selected trading mode");
  });

  it("requires Express parameters for multichain orders", () => {
    expect(() =>
      assertExpressParams({
        expressParams: undefined,
        isGmxAccount: true,
        requireExpress: false,
      })
    ).toThrow("Multichain orders are only supported with express params");
  });

  it("allows Classic and resolved Express submissions", () => {
    expect(() =>
      assertExpressParams({
        expressParams: undefined,
        isGmxAccount: false,
        requireExpress: false,
      })
    ).not.toThrow();
    expect(() =>
      assertExpressParams({
        expressParams: EXPRESS_PARAMS,
        isGmxAccount: false,
        requireExpress: true,
      })
    ).not.toThrow();
  });
});
