import { describe, expect, expectTypeOf, it } from "vitest";

import { ARBITRUM } from "configs/chains";
import type { IHttp } from "utils/http/types";

import { GmxApiSdk, type OrderValidationWarning } from "../index";

const ACCOUNT = "0x1111111111111111111111111111111111111111";
const SYMBOL = "ETH/USD [WETH-USDC]";
const MAX_UINT256 = 2n ** 256n - 1n;

type FetchCall = {
  path: string;
  query: Record<string, unknown> | undefined;
};

class TradingCapacityApi implements IHttp {
  url = "http://test";
  fetchCalls: FetchCall[] = [];

  constructor(private readonly response: unknown) {}

  fetchJson<TResult>(
    path: string,
    opts?: { query?: Record<string, unknown>; transform?: (result: unknown) => TResult }
  ): Promise<TResult> {
    this.fetchCalls.push({ path, query: opts?.query });
    if (this.response instanceof Error) {
      return Promise.reject(this.response);
    }

    const result = this.response as TResult;
    return Promise.resolve(opts?.transform ? opts.transform(result) : result);
  }

  postJson<TResult>(): Promise<TResult> {
    return Promise.reject(new Error("Unexpected postJson call"));
  }
}

class PrepareCapacityApi implements IHttp {
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
    availableLiquidity: MAX_UINT256.toString(),
    baseAvailableLiquidity: (MAX_UINT256 - 2n).toString(),
    jitAvailableLiquidity: "2",
    limitingFactor: "reserve",
    jitDataStatus: "available",
    marketDataStatus: "fresh",
  };
}

describe("GmxApiSdk.getTradingCapacity", () => {
  it("reads the dedicated capacity endpoint and parses bigint values", async () => {
    const api = new TradingCapacityApi(buildCapacity());
    const sdk = new GmxApiSdk({ chainId: ARBITRUM, api });

    const capacity = await sdk.getTradingCapacity({ symbol: SYMBOL, direction: "long" });

    expect(api.fetchCalls).toEqual([
      {
        path: "/v1/markets/trading-capacity",
        query: { symbol: SYMBOL, direction: "long" },
      },
    ]);
    expect(capacity).toEqual({
      availableLiquidity: MAX_UINT256,
      baseAvailableLiquidity: MAX_UINT256 - 2n,
      jitAvailableLiquidity: 2n,
      limitingFactor: "reserve",
      jitDataStatus: "available",
      marketDataStatus: "fresh",
    });
  });

  it("accepts safe integer, bigint, and decimal string capacity amounts", async () => {
    const sdk = new GmxApiSdk({
      chainId: ARBITRUM,
      api: new TradingCapacityApi({
        ...buildCapacity(),
        availableLiquidity: 100,
        baseAvailableLiquidity: 80n,
        jitAvailableLiquidity: "20",
      }),
    });

    await expect(sdk.getTradingCapacity({ symbol: SYMBOL, direction: "long" })).resolves.toMatchObject({
      availableLiquidity: 100n,
      baseAvailableLiquidity: 80n,
      jitAvailableLiquidity: 20n,
    });
  });

  it.each([
    ["a negative amount", { availableLiquidity: "-1" }],
    ["a non-canonical amount", { availableLiquidity: "01" }],
    ["a fractional amount", { availableLiquidity: 1.5 }],
    ["an unsafe integer amount", { availableLiquidity: Number.MAX_SAFE_INTEGER + 1 }],
    ["an overflowing amount", { availableLiquidity: (MAX_UINT256 + 1n).toString() }],
    ["an unknown limiting factor", { limitingFactor: "futureFactor" }],
    ["an unknown JIT data status", { jitDataStatus: "futureStatus" }],
    ["an unknown market data status", { marketDataStatus: "futureStatus" }],
  ])("rejects %s", async (_description, override) => {
    const sdk = new GmxApiSdk({
      chainId: ARBITRUM,
      api: new TradingCapacityApi({ ...buildCapacity(), ...override }),
    });

    await expect(sdk.getTradingCapacity({ symbol: SYMBOL, direction: "long" })).rejects.toThrow(
      "Invalid trading capacity response"
    );
  });

  it.each(["available", "stale", "unavailable"] as const)("preserves the %s JIT status", async (jitDataStatus) => {
    const response = { ...buildCapacity(), jitDataStatus };
    const sdk = new GmxApiSdk({ chainId: ARBITRUM, api: new TradingCapacityApi(response) });

    const capacity = await sdk.getTradingCapacity({ symbol: SYMBOL, direction: "short" });

    expect(capacity.jitDataStatus).toBe(jitDataStatus);
  });

  it("passes a market alias to the dedicated endpoint", async () => {
    const api = new TradingCapacityApi(buildCapacity());
    const sdk = new GmxApiSdk({ chainId: ARBITRUM, api });

    await expect(sdk.getTradingCapacity({ symbol: "ETH/USD", direction: "long" })).resolves.toMatchObject({
      availableLiquidity: MAX_UINT256,
    });
    expect(api.fetchCalls).toEqual([
      {
        path: "/v1/markets/trading-capacity",
        query: { symbol: "ETH/USD", direction: "long" },
      },
    ]);
  });

  it("propagates API errors", async () => {
    const sdk = new GmxApiSdk({
      chainId: ARBITRUM,
      api: new TradingCapacityApi(new Error("Market not found")),
    });

    await expect(sdk.getTradingCapacity({ symbol: SYMBOL, direction: "long" })).rejects.toThrow("Market not found");
  });
});

describe("GmxApiSdk.fetchMarketsTickers trading capacity", () => {
  it("parses valid capacities and drops malformed capacities", async () => {
    const sdk = new GmxApiSdk({
      chainId: ARBITRUM,
      api: new TradingCapacityApi([
        {
          symbol: SYMBOL,
          capacityLong: buildCapacity(),
          capacityShort: { ...buildCapacity(), jitAvailableLiquidity: "-1" },
        },
      ]),
    });

    await expect(sdk.fetchMarketsTickers()).resolves.toEqual([
      {
        symbol: SYMBOL,
        capacityLong: {
          availableLiquidity: MAX_UINT256,
          baseAvailableLiquidity: MAX_UINT256 - 2n,
          jitAvailableLiquidity: 2n,
          limitingFactor: "reserve",
          jitDataStatus: "available",
          marketDataStatus: "fresh",
        },
      },
    ]);
  });
});

describe("GmxApiSdk.prepareOrder trading capacity", () => {
  it("parses capacity estimates and both typed validation warnings", async () => {
    const capacity = buildCapacity();
    const sdk = new GmxApiSdk({
      chainId: ARBITRUM,
      api: new PrepareCapacityApi({
        requestId: "request-1",
        payloadType: "transaction",
        mode: "classic",
        payload: {},
        estimates: {
          positionPriceImpactDeltaUsd: "1",
          swapPriceImpactDeltaUsd: "2",
          executionFeeAmount: "3",
          acceptablePrice: "4",
          sizeDeltaUsd: "5",
          positionFeeUsd: "6",
          borrowingFeeUsd: "7",
          fundingFeeUsd: "8",
          tradingCapacity: capacity,
        },
        validationWarnings: [
          {
            code: "INSUFFICIENT_LIQUIDITY",
            message: "Order may not execute",
            details: { ...capacity, requestedSizeUsd: MAX_UINT256.toString() },
          },
          {
            code: "TRADING_CAPACITY_UNAVAILABLE",
            message: "Capacity is unavailable",
            details: { reason: "JIT_DATA_UNAVAILABLE" },
          },
        ],
      }),
    });

    const prepared = await sdk.prepareOrder({
      kind: "increase",
      symbol: SYMBOL,
      direction: "long",
      orderType: "limit",
      size: 5n,
      mode: "classic",
      from: ACCOUNT,
    });

    expect(prepared.estimates?.tradingCapacity).toEqual({
      availableLiquidity: MAX_UINT256,
      baseAvailableLiquidity: MAX_UINT256 - 2n,
      jitAvailableLiquidity: 2n,
      limitingFactor: "reserve",
      jitDataStatus: "available",
      marketDataStatus: "fresh",
    });
    expect(prepared.validationWarnings).toEqual([
      {
        code: "INSUFFICIENT_LIQUIDITY",
        message: "Order may not execute",
        details: {
          availableLiquidity: MAX_UINT256,
          baseAvailableLiquidity: MAX_UINT256 - 2n,
          jitAvailableLiquidity: 2n,
          limitingFactor: "reserve",
          jitDataStatus: "available",
          marketDataStatus: "fresh",
          requestedSizeUsd: MAX_UINT256,
        },
      },
      {
        code: "TRADING_CAPACITY_UNAVAILABLE",
        message: "Capacity is unavailable",
        details: { reason: "JIT_DATA_UNAVAILABLE" },
      },
    ]);
  });

  it("drops a malformed capacity estimate", async () => {
    const sdk = new GmxApiSdk({
      chainId: ARBITRUM,
      api: new PrepareCapacityApi({
        requestId: "request-1",
        payloadType: "transaction",
        mode: "classic",
        payload: {},
        estimates: {
          tradingCapacity: { ...buildCapacity(), marketDataStatus: "futureStatus" },
        },
      }),
    });

    const prepared = await sdk.prepareOrder({
      kind: "increase",
      symbol: SYMBOL,
      direction: "long",
      orderType: "limit",
      size: 1n,
      mode: "classic",
      from: ACCOUNT,
    });

    expect(prepared.estimates?.tradingCapacity).toBeUndefined();
  });

  it("degrades malformed capacity warning details to an unknown warning", async () => {
    const sdk = new GmxApiSdk({
      chainId: ARBITRUM,
      api: new PrepareCapacityApi({
        requestId: "request-1",
        payloadType: "transaction",
        mode: "classic",
        payload: {},
        validationWarnings: [
          {
            code: "INSUFFICIENT_LIQUIDITY",
            message: "Order may not execute",
            details: { requestedSizeUsd: "1" },
          },
        ],
      }),
    });

    const prepared = await sdk.prepareOrder({
      kind: "increase",
      symbol: SYMBOL,
      direction: "long",
      orderType: "limit",
      size: 1n,
      mode: "classic",
      from: ACCOUNT,
    });

    expect(prepared.validationWarnings).toEqual([
      {
        code: "UNKNOWN_VALIDATION_WARNING",
        originalCode: "INSUFFICIENT_LIQUIDITY",
        message: "Order may not execute",
        details: { requestedSizeUsd: "1" },
      },
    ]);
  });

  it.each([null, true, {}, { code: "", message: "Missing code" }, { code: "FUTURE_WARNING", message: "" }])(
    "drops a structurally invalid warning %p",
    async (warning) => {
      const sdk = new GmxApiSdk({
        chainId: ARBITRUM,
        api: new PrepareCapacityApi({
          requestId: "request-1",
          payloadType: "transaction",
          mode: "classic",
          payload: {},
          validationWarnings: [warning],
        }),
      });

      const prepared = await sdk.prepareOrder({
        kind: "increase",
        symbol: SYMBOL,
        direction: "long",
        orderType: "limit",
        size: 1n,
        mode: "classic",
        from: ACCOUNT,
      });

      expect(prepared.validationWarnings).toEqual([]);
    }
  );

  it("drops a non-array validationWarnings value", async () => {
    const sdk = new GmxApiSdk({
      chainId: ARBITRUM,
      api: new PrepareCapacityApi({
        requestId: "request-1",
        payloadType: "transaction",
        mode: "classic",
        payload: {},
        validationWarnings: { code: "FUTURE_WARNING", message: "A newer API warning" },
      }),
    });

    const prepared = await sdk.prepareOrder({
      kind: "increase",
      symbol: SYMBOL,
      direction: "long",
      orderType: "limit",
      size: 1n,
      mode: "classic",
      from: ACCOUNT,
    });

    expect(prepared.validationWarnings).toBeUndefined();
  });

  it("preserves unknown validation warnings for forward compatibility", async () => {
    const sdk = new GmxApiSdk({
      chainId: ARBITRUM,
      api: new PrepareCapacityApi({
        requestId: "request-1",
        payloadType: "transaction",
        mode: "classic",
        payload: {},
        validationWarnings: [
          {
            code: "FUTURE_WARNING",
            message: "A newer API warning",
            details: { retryAfter: 10 },
          },
        ],
      }),
    });

    const prepared = await sdk.prepareOrder({
      kind: "increase",
      symbol: SYMBOL,
      direction: "long",
      orderType: "limit",
      size: 1n,
      mode: "classic",
      from: ACCOUNT,
    });

    expect(prepared.validationWarnings).toEqual([
      {
        code: "UNKNOWN_VALIDATION_WARNING",
        originalCode: "FUTURE_WARNING",
        message: "A newer API warning",
        details: { retryAfter: 10 },
      },
    ]);
  });

  it("keeps known warning codes as a discriminated union", () => {
    type InsufficientLiquidityWarning = Extract<OrderValidationWarning, { code: "INSUFFICIENT_LIQUIDITY" }>;
    type UnavailableWarning = Extract<OrderValidationWarning, { code: "TRADING_CAPACITY_UNAVAILABLE" }>;

    expectTypeOf<InsufficientLiquidityWarning["details"]["requestedSizeUsd"]>().toEqualTypeOf<bigint>();
    expectTypeOf<UnavailableWarning["details"]["reason"]>().toEqualTypeOf<
      "STALE_MARKET_DATA" | "JIT_DATA_UNAVAILABLE" | "JIT_ACCOUNT_ELIGIBILITY_UNKNOWN" | "COLLATERAL_SWAP"
    >();
  });
});
