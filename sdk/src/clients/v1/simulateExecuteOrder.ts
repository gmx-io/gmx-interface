import { Abi, Address, decodeErrorResult, encodeFunctionData, withRetry } from "viem";

import { abis } from "abis";
import { getContract, tryGetContract } from "configs/contracts";
import { convertTokenAddress } from "configs/tokens";
import { extractTxnError } from "utils/errors";
import { SwapPricingType } from "utils/orders/types";
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

  const retryConfig = {
    retryCount: 2,
    delay: 200,
    shouldRetry: (error: { error: Error }) => {
      const [message] = extractTxnError(error);
      return message?.toLocaleLowerCase()?.includes("unsupported block number") ?? false;
    },
  };

  if (simulationRouterAddress) {
    // v2.2c: create-only validation (SimulationRouter can't simulate without on-chain order)
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
  } else {
    const simulateExecuteData = encodeFunctionData({
      abi: abis.SimulationRouter as Abi,
      functionName: "simulateExecuteLatestOrder",
      args: [simulationPriceParams],
    });
    simulationPayloadData.push(simulateExecuteData);

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
  }
}

function handleSimulationError(txnError: any): void {
  let msg: string | undefined = undefined;
  try {
    const errorData = extractDataFromError(txnError?.info?.error?.message) ?? extractDataFromError(txnError?.message);

    const error = new SimulateExecuteOrderError("No data found in error.", txnError);

    if (!errorData) throw error;

    const decodedError = decodeErrorResult<typeof abis.CustomErrors>({
      abi: abis.CustomErrors,
      data: errorData as Address,
    });

    const isSimulationPassed = decodedError.errorName === "EndOfOracleSimulation";

    if (isSimulationPassed) {
      return;
    }

    const parsedArgs = Object.keys(decodedError.args ?? {}).reduce(
      (acc, k) => {
        const args = (decodedError.args ?? {}) as unknown as Record<string, any>;
        acc[k] = args[k]?.toString();
        return acc;
      },
      {} as Record<string, string>
    );

    msg = `${txnError?.info?.error?.message ?? decodedError.errorName ?? txnError?.message} ${JSON.stringify(parsedArgs, null, 2)}`;
  } catch (parsingError) {
    /* eslint-disable-next-line */
    console.error(parsingError);
    msg = `Execute order simulation failed`;
    throw new Error(msg);
  }

  throw txnError;
}

export function extractDataFromError(errorMessage: unknown) {
  if (typeof errorMessage !== "string") return null;

  const pattern = /Unable to decode signature "([^"]+)"/;
  const match = errorMessage.match(pattern);

  if (match && match[1]) {
    return match[1];
  }
  return null;
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
