import { Abi, Address, encodeFunctionData, withRetry } from "viem";

import { abis } from "abis";
import { getContract, tryGetContract } from "configs/contracts";
import { convertTokenAddress } from "configs/tokens";
import { decodeSimulationErrorFromViemError, extractTxnError } from "utils/errors";
import { SwapPricingType } from "utils/orders/types";
import { encodeSimulationRouterExternalCall } from "utils/orderTransactions/simulation";
import { convertToContractPrice, getTokenData } from "utils/tokens";
import { TokenPrices, TokensData } from "utils/tokens/types";

import type { GmxSdk } from ".";

export type PriceOverrides = {
  [address: string]: TokenPrices | undefined;
};

class SimulateExecuteOrderError extends Error {
  constructor(
    message: string,
    public cause: Error
  ) {
    super(message);
  }
}

type SimulateExecuteParams = {
  createMulticallPayload: string[];
  primaryPriceOverrides: PriceOverrides;
  tokensData: TokensData;
  value: bigint;
  swapPricingType?: SwapPricingType;
};

/**
 *
 * @deprecated use simulateExecution instead
 */
export async function simulateExecuteOrder(sdk: GmxSdk, p: SimulateExecuteParams) {
  const chainId = sdk.chainId;
  const client = sdk.publicClient;

  const account = sdk.config.account;

  if (!account) {
    throw new Error("Account is not defined");
  }

  const multicallAddress = getContract(chainId, "Multicall");
  const exchangeRouterAddress = getContract(chainId, "ExchangeRouter");

  const blockTimestamp = await client.readContract({
    address: multicallAddress,
    abi: abis.Multicall as Abi,
    functionName: "getCurrentBlockTimestamp",
    args: [],
  });

  const blockNumber = await client.getBlockNumber();

  const { primaryTokens, primaryPrices } = getSimulationPrices(chainId, p.tokensData, p.primaryPriceOverrides);
  const priceTimestamp = (blockTimestamp as bigint) + 10n;

  const simulationPriceParams = {
    primaryTokens: primaryTokens,
    primaryPrices: primaryPrices,
    minTimestamp: priceTimestamp,
    maxTimestamp: priceTimestamp,
  };

  let simulationPayloadData = [...p.createMulticallPayload];

  const simulationRouterAddress = tryGetContract(chainId, "SimulationRouter");
  const simulateExecuteData = encodeFunctionData({
    abi: abis.SimulationRouter as Abi,
    functionName: "simulateExecuteLatestOrder",
    args: [simulationPriceParams],
  });

  const retryConfig = {
    retryCount: 2,
    delay: 200,
    shouldRetry: (error: { error: Error }) => {
      const [message] = extractTxnError(error);
      return message?.toLocaleLowerCase()?.includes("unsupported block number") ?? false;
    },
  };

  if (simulationRouterAddress) {
    simulationPayloadData.push(encodeSimulationRouterExternalCall(simulationRouterAddress, simulateExecuteData));
  } else {
    simulationPayloadData.push(simulateExecuteData);
  }

  try {
    await withRetry(async () => {
      return await client.simulateContract({
        address: exchangeRouterAddress,
        abi: abis.ExchangeRouter as Abi,
        functionName: "multicall",
        args: [simulationPayloadData],
        value: p.value,
        account: account as Address,
        blockNumber,
      });
    }, retryConfig);
  } catch (txnError: any) {
    handleSimulationError(txnError);
    return;
  }

  throw new SimulateExecuteOrderError(
    "Execution simulation did not revert with EndOfOracleSimulation.",
    new Error("Simulation call returned successfully.")
  );
}

function handleSimulationError(txnError: any): void {
  const decodedError = decodeSimulationErrorFromViemError(txnError);

  if (!decodedError) {
    throw new SimulateExecuteOrderError("No data found in error.", txnError);
  }

  if (decodedError.name === "EndOfOracleSimulation") {
    return;
  }

  throw txnError;
}

function getSimulationPrices(chainId: number, tokensData: TokensData, primaryPricesMap: PriceOverrides) {
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

    const currentPrice = {
      min: convertToContractPrice(token.prices.minPrice, token.decimals),
      max: convertToContractPrice(token.prices.maxPrice, token.decimals),
    };

    const primaryOverriddenPrice = primaryPricesMap[address];

    if (primaryOverriddenPrice) {
      primaryPrices.push({
        min: convertToContractPrice(primaryOverriddenPrice.minPrice, token.decimals),
        max: convertToContractPrice(primaryOverriddenPrice.maxPrice, token.decimals),
      });
    } else {
      primaryPrices.push(currentPrice);
    }
  }

  return {
    primaryTokens,
    primaryPrices,
  };
}
