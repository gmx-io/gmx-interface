import {
  CallExecutionError,
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  decodeFunctionData,
  HttpRequestError,
  InsufficientFundsError,
  InvalidInputRpcError,
  MethodNotFoundRpcError,
  RawContractError,
  RpcRequestError,
  TimeoutError,
  WebSocketRequestError,
  encodeErrorResult,
  encodeFunctionData,
} from "viem";
import type { PublicClient } from "viem";
import { describe, expect, it, vi } from "vitest";

import { abis } from "sdk/abis";
import { encodeSimulationRouterExternalCall } from "sdk/utils/orderTransactions/simulation";

import {
  isEthSimulateV1UnsupportedError,
  isInsufficientFundsError,
  isTemporaryError,
  simulateContractWithRetry,
} from "../simulation";

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

  describe("pre-call simulation", () => {
    const account = "0x1111111111111111111111111111111111111111";
    const preCallTarget = "0x2222222222222222222222222222222222222222";
    const routerAddress = "0x3333333333333333333333333333333333333333";
    const endOfOracleSimulationData = encodeErrorResult({
      abi: abis.CustomErrors,
      errorName: "EndOfOracleSimulation",
    });

    function runPreCallSimulation(simulateCalls: ReturnType<typeof vi.fn>) {
      return simulateContractWithRetry({
        client: { simulateCalls } as unknown as PublicClient,
        address: routerAddress,
        abi: abis.ExchangeRouter,
        args: [["0x1234"]],
        value: 5n,
        account,
        blockNumber: 123n,
        isExpress: false,
        preCalls: [{ data: "0x5678", to: preCallTarget }],
      });
    }

    it("simulates pre-calls and the router multicall in order", async () => {
      const simulateCalls = vi.fn().mockResolvedValue({
        results: [
          { status: "success" },
          {
            status: "failure",
            error: new RawContractError({ data: endOfOracleSimulationData }),
          },
        ],
      });

      await expect(runPreCallSimulation(simulateCalls)).resolves.toBeUndefined();
      expect(simulateCalls).toHaveBeenCalledWith({
        account,
        blockNumber: 123n,
        calls: [
          { data: "0x5678", to: preCallTarget, value: undefined },
          {
            data: encodeFunctionData({
              abi: abis.ExchangeRouter,
              functionName: "multicall",
              args: [["0x1234"]],
            }),
            to: routerAddress,
            value: 5n,
          },
        ],
      });
    });

    it("does not treat a sentinel-shaped pre-call failure as success", async () => {
      const sentinelError = new RawContractError({ data: endOfOracleSimulationData });
      const simulateCalls = vi.fn().mockResolvedValue({
        results: [
          { status: "failure", error: sentinelError },
          { status: "failure", error: sentinelError },
        ],
      });

      await expect(runPreCallSimulation(simulateCalls)).rejects.toThrow("EndOfOracleSimulation");
    });

    it("skips only the remote preflight when eth_simulateV1 is unavailable", async () => {
      const simulateCalls = vi
        .fn()
        .mockRejectedValue(new MethodNotFoundRpcError(new Error("not found"), { method: "eth_simulateV1" }));

      await expect(runPreCallSimulation(simulateCalls)).resolves.toBeUndefined();
      expect(simulateCalls).toHaveBeenCalledOnce();
    });

    it("does not swallow other RPC failures", async () => {
      const simulateCalls = vi.fn().mockRejectedValue(new Error("RPC unavailable"));

      await expect(runPreCallSimulation(simulateCalls)).rejects.toThrow("RPC unavailable");
    });
  });

  describe("isEthSimulateV1UnsupportedError", () => {
    it("recognizes nested method-not-found errors", () => {
      const error = new MethodNotFoundRpcError(new Error("not found"), { method: "eth_simulateV1" });

      expect(isEthSimulateV1UnsupportedError(error)).toBe(true);
    });

    it("recognizes provider-specific unsupported messages", () => {
      expect(isEthSimulateV1UnsupportedError(new Error("eth_simulateV1 is not supported"))).toBe(true);
    });

    it("does not classify unrelated RPC errors as unsupported", () => {
      expect(isEthSimulateV1UnsupportedError(new Error("RPC unavailable"))).toBe(false);
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
