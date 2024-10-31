import { Abi, Address, decodeErrorResult, encodeFunctionData, withRetry } from "viem";

import CustomErrors from "abis/CustomErrors.json";
import DataStore from "abis/DataStore.json";
import ExchangeRouter from "abis/ExchangeRouter.json";
import Multicall from "abis/Multicall.json";

import { getContract } from "configs/contracts";
import { NONCE_KEY, orderKey } from "configs/dataStore";
import { convertTokenAddress } from "configs/tokens";

import { SwapPricingType } from "types/orders";
import { TokenPrices, TokensData } from "types/tokens";
import { convertToContractPrice, getTokenData } from "./tokens";

import type { GmxSdk } from "..";

export type PriceOverrides = {
  [address: string]: TokenPrices | undefined;
};

type SimulateExecuteParams = {
  createMulticallPayload: string[];
  primaryPriceOverrides: PriceOverrides;
  tokensData: TokensData;
  value: bigint;
  swapPricingType?: SwapPricingType;
};

export async function simulateExecuteOrder(sdk: GmxSdk, p: SimulateExecuteParams) {
  const chainId = sdk.chainId;
  const client = sdk.publicClient;

  const account = sdk.config.account;

  if (!account) {
    throw new Error("Account is not defined");
  }

  const dataStoreAddress = getContract(chainId, "DataStore");
  const multicallAddress = getContract(chainId, "Multicall");
  const exchangeRouterAddress = getContract(chainId, "ExchangeRouter");

  const [nonce, blockTimestamp] = await Promise.all([
    client.readContract({
      address: dataStoreAddress,
      abi: DataStore.abi as Abi,
      functionName: "getUint",
      args: [NONCE_KEY],
    }),
    client.readContract({
      address: multicallAddress,
      abi: Multicall.abi,
      functionName: "getCurrentBlockTimestamp",
      args: [],
    }),
  ]);

  const blockNumber = await client.getBlockNumber();

  const nextNonce = (nonce as bigint) + 1n;
  const nextKey = orderKey(dataStoreAddress, nextNonce);

  const { primaryTokens, primaryPrices } = getSimulationPrices(chainId, p.tokensData, p.primaryPriceOverrides);
  const priceTimestamp = (blockTimestamp as bigint) + 10n;

  const simulationPriceParams = {
    primaryTokens: primaryTokens,
    primaryPrices: primaryPrices,
    minTimestamp: priceTimestamp,
    maxTimestamp: priceTimestamp,
  };

  let simulationPayloadData = [...p.createMulticallPayload];

  const routerAbi = ExchangeRouter.abi as Abi;
  const routerAddress = exchangeRouterAddress;

  let encodedFunctionData: string;

  encodedFunctionData = encodeFunctionData({
    abi: routerAbi,
    functionName: "simulateExecuteOrder",
    args: [nextKey, simulationPriceParams],
  });
  simulationPayloadData.push(encodedFunctionData);

  try {
    await withRetry(
      async () => {
        const encodedMulticallData = encodeFunctionData({
          abi: routerAbi,
          functionName: "multicall",
          args: [simulationPayloadData],
        });

        return await client.call({
          to: routerAddress,
          data: encodedMulticallData,
          value: p.value,
          blockNumber,
          account: account as Address,
        });
      },
      {
        retryCount: 2,
        delay: 200,
      }
    );
  } catch (txnError) {
    let msg: React.ReactNode = undefined;

    try {
      const errorData = extractDataFromError(txnError?.info?.error?.message) ?? extractDataFromError(txnError?.message);

      const error = new Error("No data found in error.");
      error.cause = txnError;
      if (!errorData) throw error;

      const decodedError = decodeErrorResult({
        abi: CustomErrors.abi,
        data: errorData as any,
      });

      const isSimulationPassed = decodedError.errorName === "EndOfOracleSimulation";

      if (isSimulationPassed) {
        return;
      }

      const parsedArgs = Object.keys(decodedError.args ?? {}).reduce(
        (acc, k) => {
          acc[k] = decodedError.args?.[k].toString();
          return acc;
        },
        {} as Record<string, string>
      );

      msg = `${txnError?.info?.error?.message ?? decodedError.errorName ?? txnError?.message} ${JSON.stringify(parsedArgs, null, 2)}`;
    } catch (parsingError) {
      console.error(parsingError);
      msg = `Execute order simulation failed`;
    }

    throw txnError;
  }
}

export function extractDataFromError(errorMessage: unknown) {
  if (typeof errorMessage !== "string") return null;

  const pattern = /data="([^"]+)"/;
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
