import { encodeFunctionData, decodeErrorResult } from "viem";

import { abis } from "abis";
import { getContract } from "configs/contracts";
import { convertTokenAddress } from "configs/tokens";
import type { ContractsChainId } from "configs/chains";
import type { IRpc } from "utils/rpc";
import { convertToContractPrice, getTokenData } from "utils/tokens";
import type { TokenPrices, TokensData } from "utils/tokens/types";

import type { BatchOrderTxnParams } from "./utils";
import { getBatchOrderMulticallPayload } from "./utils";

export type SimulationPriceOverrides = {
  [address: string]: TokenPrices | undefined;
};

export type SimulateOrderParams = {
  chainId: ContractsChainId;
  rpc: IRpc;
  account: string;
  tokensData: TokensData;
  batchParams: BatchOrderTxnParams;
  priceOverrides?: SimulationPriceOverrides;
  /** Pre-fetched block timestamp. If not provided, will be fetched via rpc. */
  blockTimestamp?: bigint;
};

function buildSimulationPrices(
  chainId: number,
  tokensData: TokensData,
  overrides: SimulationPriceOverrides
) {
  const tokenAddresses = Object.keys(tokensData);
  const primaryTokens: string[] = [];
  const primaryPrices: { min: bigint; max: bigint }[] = [];

  for (const address of tokenAddresses) {
    const token = getTokenData(tokensData, address);
    const convertedAddress = convertTokenAddress(chainId, address, "wrapped");

    if (!token?.prices || primaryTokens.includes(convertedAddress)) {
      continue;
    }

    primaryTokens.push(convertedAddress);

    const overriddenPrice = overrides[address];

    if (overriddenPrice) {
      primaryPrices.push({
        min: convertToContractPrice(overriddenPrice.minPrice, token.decimals),
        max: convertToContractPrice(overriddenPrice.maxPrice, token.decimals),
      });
    } else {
      primaryPrices.push({
        min: convertToContractPrice(token.prices.minPrice, token.decimals),
        max: convertToContractPrice(token.prices.maxPrice, token.decimals),
      });
    }
  }

  return { primaryTokens, primaryPrices };
}

export async function fetchBlockTimestamp(rpc: IRpc, chainId: ContractsChainId): Promise<bigint> {
  const multicallAddress = getContract(chainId, "Multicall");

  const calldata = encodeFunctionData({
    abi: abis.Multicall,
    functionName: "getCurrentBlockTimestamp",
  });

  const result = await rpc.call({
    to: multicallAddress,
    data: calldata,
  });

  return BigInt(result);
}

/**
 * Simulates order execution by calling ExchangeRouter.multicall with
 * the order payload + simulateExecuteLatestOrder via eth_call.
 *
 * A successful simulation reverts with EndOfOracleSimulation.
 * Any other revert is a real error and is thrown.
 */
export async function simulateOrderExecution(params: SimulateOrderParams): Promise<void> {
  const {
    chainId,
    rpc,
    account,
    tokensData,
    batchParams,
    priceOverrides = {},
  } = params;

  const exchangeRouterAddress = getContract(chainId, "ExchangeRouter");

  const blockTimestamp = params.blockTimestamp ?? await fetchBlockTimestamp(rpc, chainId);
  const priceTimestamp = blockTimestamp + 120n;

  const { primaryTokens, primaryPrices } = buildSimulationPrices(chainId, tokensData, priceOverrides);

  const simulationPriceParams = {
    primaryTokens,
    primaryPrices,
    minTimestamp: priceTimestamp,
    maxTimestamp: priceTimestamp,
  };

  // Build encoded multicall from batchParams (only first createOrder for simulation)
  const simulationBatchParams: BatchOrderTxnParams = {
    createOrderParams: batchParams.createOrderParams.slice(0, 1),
    updateOrderParams: [],
    cancelOrderParams: [],
  };

  const { encodedMulticall, value } = getBatchOrderMulticallPayload({ params: simulationBatchParams });

  const simulationPayload = [
    ...encodedMulticall,
    encodeFunctionData({
      abi: abis.ExchangeRouter,
      functionName: "simulateExecuteLatestOrder",
      args: [simulationPriceParams],
    }),
  ];

  const multicallCalldata = encodeFunctionData({
    abi: abis.ExchangeRouter,
    functionName: "multicall",
    args: [simulationPayload],
  });

  // State override: give account enough ETH to cover execution fee value
  const stateOverride = account
    ? [{ address: account, balance: 10n ** 24n }]
    : undefined;

  try {
    await rpc.call({
      from: account,
      to: exchangeRouterAddress,
      data: multicallCalldata,
      value,
      stateOverride,
    });
  } catch (error: any) {
    const revertData = extractRevertData(error);

    if (revertData) {
      try {
        const decoded = decodeErrorResult({
          abi: abis.CustomErrors,
          data: revertData as `0x${string}`,
        });

        if (decoded.errorName === "EndOfOracleSimulation") {
          return;
        }

        const args = decoded.args
          ? Object.fromEntries(
              Object.entries(decoded.args as unknown as Record<string, unknown>).map(([k, v]) => [k, String(v)])
            )
          : {};

        throw new Error(`Simulation failed: ${decoded.errorName} ${JSON.stringify(args)}`);
      } catch (decodeError) {
        if (decodeError instanceof Error && decodeError.message.startsWith("Simulation failed:")) {
          throw decodeError;
        }
      }
    }

    throw error;
  }
}

function extractRevertData(error: any): string | null {
  if (typeof error?.data === "string" && error.data.startsWith("0x")) {
    return error.data;
  }

  if (typeof error?.error?.data === "string" && error.error.data.startsWith("0x")) {
    return error.error.data;
  }

  if (typeof error?.cause?.data === "string" && error.cause.data.startsWith("0x")) {
    return error.cause.data;
  }

  const msg = error?.message ?? error?.toString() ?? "";
  const match = msg.match(/0x[0-9a-fA-F]{8,}/);
  return match ? match[0] : null;
}
