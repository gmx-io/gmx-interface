import { describe, expect, expectTypeOf, it } from "vitest";

import type { IHttp } from "utils/http/types";
import { prepareOrder } from "utils/orderTransactions/api";

import { HttpError, isPrepareOrderError, parsePrepareOrderError, type PrepareOrderErrorCode } from "../index";

const MAX_UINT256 = 2n ** 256n - 1n;

class PrepareApi implements IHttp {
  url = "http://test";

  constructor(private readonly response: unknown) {}

  fetchJson<TResult>(): Promise<TResult> {
    return Promise.reject(new Error("Unexpected fetchJson call"));
  }

  postJson<TResult>(
    _path: string,
    _body: unknown,
    opts?: { transform?: (result: unknown) => TResult }
  ): Promise<TResult> {
    const result = this.response as TResult;
    return Promise.resolve(opts?.transform ? opts.transform(result) : result);
  }
}

function buildCapacity() {
  return {
    availableLiquidity: "100",
    baseAvailableLiquidity: "80",
    jitAvailableLiquidity: "20",
    limitingFactor: "reserve",
    jitDataStatus: "available",
    marketDataStatus: "fresh",
  };
}

function buildInsufficientLiquidityBody(requestedSizeUsd: unknown) {
  return {
    code: "INSUFFICIENT_LIQUIDITY",
    message: "Insufficient liquidity",
    details: { ...buildCapacity(), requestedSizeUsd },
  };
}

function buildPrepareResponse(requestedSizeUsd: unknown) {
  return {
    requestId: "request-1",
    payloadType: "transaction",
    mode: "classic",
    payload: {},
    validationWarnings: [buildInsufficientLiquidityBody(requestedSizeUsd)],
  };
}

const prepareRequest = {
  kind: "increase" as const,
  symbol: "ETH/USD [WETH-USDC]",
  direction: "long" as const,
  orderType: "limit" as const,
  size: 1n,
  mode: "classic" as const,
  from: "0x1111111111111111111111111111111111111111",
};

describe("prepare order errors", () => {
  it("parses and deserializes an insufficient-liquidity HttpError", () => {
    const error = new HttpError(400, "Bad Request", buildInsufficientLiquidityBody(MAX_UINT256.toString()));

    const parsed = parsePrepareOrderError(error);

    expect(parsed).toEqual({
      code: "INSUFFICIENT_LIQUIDITY",
      message: "Insufficient liquidity",
      details: {
        availableLiquidity: 100n,
        baseAvailableLiquidity: 80n,
        jitAvailableLiquidity: 20n,
        limitingFactor: "reserve",
        jitDataStatus: "available",
        marketDataStatus: "fresh",
        requestedSizeUsd: MAX_UINT256,
      },
    });
    expect(isPrepareOrderError(parsed)).toBe(true);
    expect(isPrepareOrderError(buildInsufficientLiquidityBody(MAX_UINT256.toString()))).toBe(false);

    if (parsed?.code !== "INSUFFICIENT_LIQUIDITY") {
      throw new Error("Expected insufficient-liquidity error");
    }
    expectTypeOf(parsed.details.requestedSizeUsd).toEqualTypeOf<bigint>();
  });

  it.each<PrepareOrderErrorCode>([
    "INVALID_PARAMS",
    "MARKET_NOT_FOUND",
    "TOKEN_NOT_FOUND",
    "NO_SWAP_PATH",
    "POSITION_NOT_FOUND",
  ])("parses the documented %s error", (code) => {
    const parsed = parsePrepareOrderError(new HttpError(400, "Bad Request", { code, message: "Prepare failed" }));

    expect(parsed).toEqual({ code, message: "Prepare failed" });
    expect(isPrepareOrderError(parsed)).toBe(true);
  });

  it("parses a documented code-less bad request", () => {
    const parsed = parsePrepareOrderError(new HttpError(400, "Bad Request", { message: "Invalid request" }));

    expect(parsed).toEqual({ message: "Invalid request" });
    expect(isPrepareOrderError(parsed)).toBe(true);
  });

  it("parses documented field validation errors", () => {
    const parsed = parsePrepareOrderError(
      new HttpError(400, "Bad Request", {
        message: {
          size: { message: "size must be a positive integer", value: "invalid" },
          symbol: { message: "symbol is required" },
        },
      })
    );

    expect(parsed).toEqual({
      message: {
        size: { message: "size must be a positive integer", value: "invalid" },
        symbol: { message: "symbol is required" },
      },
    });
    expect(isPrepareOrderError(parsed)).toBe(true);
  });

  it.each([
    ["a non-HTTP error", new Error("Prepare failed")],
    ["a non-400 response", new HttpError(500, "Internal Server Error", buildInsufficientLiquidityBody("101"))],
    ["a raw response body", buildInsufficientLiquidityBody("101")],
    ["an unknown code", new HttpError(400, "Bad Request", { code: "FUTURE_ERROR", message: "Prepare failed" })],
    [
      "malformed field validation errors",
      new HttpError(400, "Bad Request", { message: { size: { value: "invalid" } } }),
    ],
    [
      "malformed capacity details",
      new HttpError(400, "Bad Request", {
        ...buildInsufficientLiquidityBody("101"),
        details: { requestedSizeUsd: "101" },
      }),
    ],
  ])("does not classify %s as a prepare error", (_description, error) => {
    expect(parsePrepareOrderError(error)).toBeUndefined();
  });

  it.each([true, 1, 1.5, null, undefined, "", "-1", "+1", "01", "1.0", "0x1", (MAX_UINT256 + 1n).toString()])(
    "rejects non-canonical requestedSizeUsd %p in error details",
    (requestedSizeUsd) => {
      const error = new HttpError(400, "Bad Request", buildInsufficientLiquidityBody(requestedSizeUsd));

      expect(parsePrepareOrderError(error)).toBeUndefined();
    }
  );
});

describe("prepare order warning amount parsing", () => {
  it.each([true, 1, 1.5, null, undefined, "", "-1", "+1", "01", "1.0", "0x1", (MAX_UINT256 + 1n).toString()])(
    "rejects non-canonical requestedSizeUsd %p",
    async (requestedSizeUsd) => {
      await expect(
        prepareOrder({ api: new PrepareApi(buildPrepareResponse(requestedSizeUsd)) }, prepareRequest)
      ).rejects.toThrow("Invalid insufficient-liquidity warning in prepare response");
    }
  );

  it("accepts the canonical zero amount", async () => {
    const prepared = await prepareOrder({ api: new PrepareApi(buildPrepareResponse("0")) }, prepareRequest);

    expect(prepared.validationWarnings?.[0]).toMatchObject({
      code: "INSUFFICIENT_LIQUIDITY",
      details: { requestedSizeUsd: 0n },
    });
  });
});
