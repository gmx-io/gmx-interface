import {
  CallExecutionError,
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  decodeFunctionData,
  encodeErrorResult,
  HttpRequestError,
  InsufficientFundsError,
  InvalidInputRpcError,
  RpcRequestError,
  TimeoutError,
  WebSocketRequestError,
} from "viem";
import type { PublicClient } from "viem";
import { describe, expect, it, vi } from "vitest";

import "lib/monkeyPatching";
import { parseError } from "lib/errors";
import { abis } from "sdk/abis";
import { encodeSimulationRouterExternalCall } from "sdk/utils/orderTransactions/simulation";

import { isInsufficientFundsError, isTemporaryError, simulateContractWithRetry } from "../simulation";

describe("simulation", () => {
  it("routes execution simulation through ExchangeRouter.makeExternalCalls", () => {
    const simulationRouterAddress = "0x1111111111111111111111111111111111111111";
    const simulateExecuteData = "0x1234";
    const encodedCall = encodeSimulationRouterExternalCall(simulationRouterAddress, simulateExecuteData);
    const decodedCall = decodeFunctionData({ abi: abis.ExchangeRouter, data: encodedCall });

    expect(decodedCall.functionName).toBe("makeExternalCalls");
    expect(decodedCall.args).toEqual([[simulationRouterAddress], [simulateExecuteData], [], []]);
  });

  it("rejects a simulation call that returns without the expected sentinel revert", async () => {
    const simulateContract = vi.fn().mockResolvedValue({});

    await expect(
      simulateContractWithRetry({
        client: { simulateContract } as unknown as PublicClient,
        address: "0x1111111111111111111111111111111111111111",
        abi: [],
        args: [[]],
        value: 0n,
        account: "0x2222222222222222222222222222222222222222",
        blockNumber: undefined,
        isExpress: false,
      })
    ).rejects.toThrow("Execution simulation did not revert with EndOfOracleSimulation.");
    expect(simulateContract).toHaveBeenCalledOnce();
  });

  it("rethrows a contract revert so that the error toast can read the contract error", async () => {
    const data = encodeErrorResult({
      abi: abis.CustomErrors,
      errorName: "LiquidatablePosition",
      args: ["min collateral for leverage", 100n, 5n, 180n],
    });
    const simulateContract = vi.fn().mockRejectedValue(
      new ContractFunctionExecutionError(
        new ContractFunctionRevertedError({ abi: [], functionName: "multicall", data }),
        {
          abi: [],
          functionName: "multicall",
        }
      )
    );

    const error = await simulateContractWithRetry({
      client: { simulateContract } as unknown as PublicClient,
      address: "0x1111111111111111111111111111111111111111",
      abi: [],
      args: [[]],
      value: 0n,
      account: "0x2222222222222222222222222222222222222222",
      blockNumber: undefined,
      isExpress: false,
    }).catch((e) => e);

    expect(parseError(error)).toEqual(
      expect.objectContaining({
        contractError: "LiquidatablePosition",
        contractErrorArgs: {
          reason: "min collateral for leverage",
          remainingCollateralUsd: 100n,
          minCollateralUsd: 5n,
          minCollateralUsdForLeverage: 180n,
        },
        errorContext: "simulation",
      })
    );
  });

  describe("with calls the wallet batch sends first", () => {
    const ROUTER = "0x1111111111111111111111111111111111111111";
    const ACCOUNT = "0x2222222222222222222222222222222222222222";
    const APPROVE = { to: "0x3333333333333333333333333333333333333333", data: "0x095ea7b3" } as const;

    function revert(errorName: string) {
      return new ContractFunctionExecutionError(
        new ContractFunctionRevertedError({
          abi: [],
          functionName: "multicall",
          data: encodeErrorResult({ abi: abis.CustomErrors, errorName: errorName as any, args: [] as any }),
        }),
        { abi: [], functionName: "multicall" }
      );
    }

    function simulate(simulateCalls: ReturnType<typeof vi.fn>) {
      return simulateContractWithRetry({
        client: { simulateCalls } as unknown as PublicClient,
        address: ROUTER,
        abi: abis.ExchangeRouter,
        args: [[]],
        value: 1n,
        account: ACCOUNT,
        blockNumber: undefined,
        isExpress: false,
        preCalls: [APPROVE],
      });
    }

    it("runs the approvals before the multicall in one simulated block and accepts the sentinel revert", async () => {
      const simulateCalls = vi.fn().mockResolvedValue({
        results: [{ status: "success" }, { status: "failure", error: revert("EndOfOracleSimulation") }],
      });

      await expect(simulate(simulateCalls)).resolves.toBeUndefined();
      expect(simulateCalls).toHaveBeenCalledWith(
        expect.objectContaining({
          account: ACCOUNT,
          calls: [APPROVE, expect.objectContaining({ to: ROUTER, value: 1n })],
        })
      );
    });

    it("fails when an approval of the batch fails", async () => {
      const simulateCalls = vi.fn().mockResolvedValue({
        results: [
          { status: "failure", error: new Error("ERC20: approve from the zero address") },
          { status: "success" },
        ],
      });

      const error = await simulate(simulateCalls).catch((e) => e);

      expect(parseError(error)).toEqual(expect.objectContaining({ errorContext: "simulation" }));
    });

    it("fails instead of sending the batch unchecked when the RPC can't run eth_simulateV1", async () => {
      const simulateCalls = vi.fn().mockRejectedValue(Object.assign(new Error("method not found"), { code: -32601 }));

      const error = await simulate(simulateCalls).catch((e) => e);

      expect(parseError(error)).toEqual(expect.objectContaining({ errorContext: "simulation" }));
    });
  });

  describe("isTemporaryError", () => {
    it("should return true for RpcRequestError with header not found message", () => {
      const error = new ContractFunctionExecutionError(
        new CallExecutionError(
          new RpcRequestError({
            url: "https://example.com",
            body: {},
            error: {
              code: -32000,
              message: "header not found",
            },
          }),
          {}
        ),
        {
          abi: [],
          functionName: "test_function",
        }
      );

      expect(isTemporaryError(error)).toBe(true);
    });

    it("should return true for HttpRequestError", () => {
      const error = new HttpRequestError({
        body: {},
        details: "failed to fetch",
        headers: new Headers(),
        status: 500,
        url: "https://example.com",
      });

      expect(isTemporaryError(error)).toBe(true);
    });

    it("should return true for TimeoutError", () => {
      const error = new TimeoutError({
        body: {},
        url: "https://example.com",
      });

      expect(isTemporaryError(error)).toBe(true);
    });

    it("should return true for WebSocketRequestError", () => {
      const error = new WebSocketRequestError({
        body: {},
        url: "wss://example.com",
      });

      expect(isTemporaryError(error)).toBe(true);
    });

    it("should return true for RpcRequestError with temporary error codes", () => {
      const error = new RpcRequestError({
        body: {},
        error: {
          code: -32001,
          message: "Resource not found",
        },
        url: "https://example.com",
      });

      expect(isTemporaryError(error)).toBe(true);
    });

    it("should return false for ContractFunctionRevertedError", () => {
      const error = new ContractFunctionRevertedError({
        abi: [],
        functionName: "test",
        data: "0x1234",
      });

      expect(isTemporaryError(error)).toBe(false);
    });

    it("should return false for non-viem errors", () => {
      const error = new Error("Some error");

      expect(isTemporaryError(error)).toBe(false);
    });
  });

  describe("isInsufficientFundsError", () => {
    it("should return true for ContractFunctionExecutionError wrapping InsufficientFundsError", () => {
      const error = new ContractFunctionExecutionError(
        new CallExecutionError(
          new InsufficientFundsError({
            cause: new InvalidInputRpcError(
              new InvalidInputRpcError(
                new RpcRequestError({
                  error: {
                    message:
                      "err: insufficient funds for gas * price + value: address 0x6f9f3106F0209dc560A53C6808f8BF32E38468C3 have 4174472651641805 want 10000000000000000000 (supplied gas 1100000000)",
                    code: -32000,
                  },
                  body: {},
                  url: "https://example.com",
                })
              )
            ),
          }),
          {}
        ),
        {
          abi: [],
          functionName: "test_function",
        }
      );

      expect(isInsufficientFundsError(error)).toBe(true);
    });

    it("should return false for base Error", () => {
      const error = new Error("Some error");

      expect(isInsufficientFundsError(error)).toBe(false);
    });
  });
});
