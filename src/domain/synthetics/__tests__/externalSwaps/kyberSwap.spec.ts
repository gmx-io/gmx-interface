import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { suppressConsole } from "lib/__testUtils__/_utils";

import { getKyberSwapRoute, buildKyberSwapTxn } from "../../externalSwaps/kyberSwap";

const KYBER_SWAP_ROUTER = "0x6131B5fae19EA4f9D964eAc0408E4408b66337b5";
const WETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const SENDER = "0x1111111111111111111111111111111111111111";
const RECEIVER = "0x2222222222222222222222222222222222222222";

const mockRouteSummary = {
  tokenIn: WETH,
  amountIn: "1000000000000000000",
  amountInUsd: "2500",
  tokenOut: USDC,
  amountOut: "2495000000",
  amountOutUsd: "2495",
  gas: "200000",
  gasPrice: "100000000",
  gasUsd: "0.05",
  extraFee: { feeAmount: "0", chargeFeeBy: "", isInBps: false, feeReceiver: "" },
  route: [[]],
};

function createRouteResponse(overrides?: Partial<{ code: number; message: string; routerAddress: string }>) {
  return {
    code: overrides?.code ?? 0,
    message: overrides?.message ?? "success",
    data: {
      routeSummary: mockRouteSummary,
      routerAddress: overrides?.routerAddress ?? KYBER_SWAP_ROUTER,
    },
  };
}

function createBuildResponse(
  overrides?: Partial<{ code: number; message: string; routerAddress: string; amountOut: string }>
) {
  return {
    code: overrides?.code ?? 0,
    message: overrides?.message ?? "success",
    data: {
      amountIn: "1000000000000000000",
      amountInUsd: "2500",
      amountOut: overrides?.amountOut ?? "2495000000",
      amountOutUsd: "2495",
      gas: "200000",
      gasUsd: "0.05",
      outputChange: { amount: "0", percent: 0, level: 0 },
      data: "0xabcdef",
      routerAddress: overrides?.routerAddress ?? KYBER_SWAP_ROUTER,
    },
  };
}

const defaultParams = {
  chainId: ARBITRUM as 42161,
  tokenInAddress: WETH,
  tokenOutAddress: USDC,
  amountIn: 1000000000000000000n,
  senderAddress: SENDER,
  receiverAddress: RECEIVER,
  gasPrice: 100000000n,
  slippage: 50,
};

describe("getKyberSwapRoute", () => {
  suppressConsole();

  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns quote and buildContext on successful route", async () => {
    fetchMock.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve(createRouteResponse()),
    });

    const result = await getKyberSwapRoute(defaultParams);

    expect(result).toBeDefined();
    expect(result!.quote.to).toBe(KYBER_SWAP_ROUTER);
    expect(result!.quote.value).toBe(0n);
    expect(result!.quote.amountIn).toBe(1000000000000000000n);
    expect(result!.quote.outputAmount).toBe(2495000000n);
    expect(result!.quote.estimatedGas).toBe(200000n);
    expect(result!.quote.gasPrice).toBe(100000000n);
    expect(result!.quote.usdIn).toBeGreaterThan(0n);
    expect(result!.quote.usdOut).toBeGreaterThan(0n);
    expect(result!.quote.priceIn).toBeGreaterThan(0n);
    expect(result!.quote.priceOut).toBeGreaterThan(0n);

    expect(result!.buildContext.routeSummary).toEqual(mockRouteSummary);
    expect(result!.buildContext.senderAddress).toBe(SENDER);
    expect(result!.buildContext.receiverAddress).toBe(RECEIVER);
    expect(result!.buildContext.slippage).toBe(50);
  });

  it("only calls route API (not build)", async () => {
    fetchMock.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve(createRouteResponse()),
    });

    await getKyberSwapRoute(defaultParams);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const routeUrl = fetchMock.mock.calls[0][0] as string;
    expect(routeUrl).toContain("/api/v1/routes");
  });

  it("sends correct headers and params to route API", async () => {
    fetchMock.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve(createRouteResponse()),
    });

    await getKyberSwapRoute(defaultParams);

    const routeCall = fetchMock.mock.calls[0];
    const routeUrl = routeCall[0] as string;
    const routeOptions = routeCall[1];

    expect(routeUrl).toContain("aggregator-api.kyberswap.com/arbitrum/api/v1/routes");
    expect(routeUrl).toContain(`tokenIn=${WETH}`);
    expect(routeUrl).toContain(`tokenOut=${USDC}`);
    expect(routeUrl).toContain("amountIn=1000000000000000000");
    expect(routeOptions.headers["x-client-id"]).toBe("gmx5326");
  });

  it("returns undefined on 403 (IP banned)", async () => {
    fetchMock.mockResolvedValueOnce({
      status: 403,
      text: () => Promise.resolve("Forbidden"),
    });

    const result = await getKyberSwapRoute(defaultParams);

    expect(result).toBeUndefined();
  });

  it("returns undefined when route response has no data", async () => {
    fetchMock.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve({ code: 0, message: "no route", data: undefined }),
    });

    const result = await getKyberSwapRoute(defaultParams);

    expect(result).toBeUndefined();
  });

  it("returns undefined when route response code is not 0", async () => {
    fetchMock.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve(createRouteResponse({ code: 4000, message: "invalid token" })),
    });

    const result = await getKyberSwapRoute(defaultParams);

    expect(result).toBeUndefined();
  });

  it("returns undefined when route returns wrong router address", async () => {
    fetchMock.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve(createRouteResponse({ routerAddress: "0xdeadbeef" })),
    });

    const result = await getKyberSwapRoute(defaultParams);

    expect(result).toBeUndefined();
  });

  it("returns undefined when fetch throws", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network error"));

    const result = await getKyberSwapRoute(defaultParams);

    expect(result).toBeUndefined();
  });
});

describe("buildKyberSwapTxn", () => {
  suppressConsole();

  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds transaction using provided build context", async () => {
    // First, fetch a route to get the buildContext
    fetchMock.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve(createRouteResponse()),
    });

    const routeResult = await getKyberSwapRoute(defaultParams);

    // Now build the transaction using the context
    fetchMock.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve(createBuildResponse()),
    });

    const result = await buildKyberSwapTxn(routeResult!.buildContext);

    expect(result.to).toBe(KYBER_SWAP_ROUTER);
    expect(result.data).toBe("0xabcdef");
  });

  it("sends correct body to build API", async () => {
    // Fetch route first
    fetchMock.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve(createRouteResponse()),
    });

    const routeResult = await getKyberSwapRoute(defaultParams);

    // Build transaction
    fetchMock.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve(createBuildResponse()),
    });

    await buildKyberSwapTxn(routeResult!.buildContext);

    const buildCall = fetchMock.mock.calls[1];
    const buildUrl = buildCall[0] as string;
    const buildOptions = buildCall[1];

    expect(buildUrl).toContain("/api/v1/route/build");
    expect(buildOptions.method).toBe("POST");
    expect(buildOptions.headers["Content-Type"]).toBe("application/json");
    expect(buildOptions.headers["x-client-id"]).toBe("gmx5326");

    const body = JSON.parse(buildOptions.body);
    expect(body.sender).toBe(SENDER);
    expect(body.recipient).toBe(RECEIVER);
    expect(body.slippageTolerance).toBe(50);
    expect(body.routeSummary).toEqual(mockRouteSummary);
  });

  it("throws when build response code is not 0", async () => {
    fetchMock.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve(createRouteResponse()),
    });

    const routeResult = await getKyberSwapRoute(defaultParams);

    fetchMock.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve({ code: 4000, message: "build failed", data: undefined }),
    });

    await expect(buildKyberSwapTxn(routeResult!.buildContext)).rejects.toThrow("Failed to build transaction");
  });

  it("throws when build returns wrong router address", async () => {
    fetchMock.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve(createRouteResponse()),
    });

    const routeResult = await getKyberSwapRoute(defaultParams);

    fetchMock.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve(createBuildResponse({ routerAddress: "0xdeadbeef" })),
    });

    await expect(buildKyberSwapTxn(routeResult!.buildContext)).rejects.toThrow("Invalid KyberSwapRouter address");
  });
});
