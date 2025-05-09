import { BaseContract } from "ethers";
import { withRetry } from "viem";

import {
  getContract,
  getExchangeRouterContract,
  getGlvRouterContract,
  getMulticallContract,
  getZeroAddressContract,
} from "config/contracts";
import { isGlvEnabled } from "domain/synthetics/markets/glv";
import { SwapPricingType } from "domain/synthetics/orders";
import { TokenPrices, TokensData, convertToContractPrice, getTokenData } from "domain/synthetics/tokens";
import { getProvider } from "lib/rpc";
import { getTenderlyConfig, simulateTxWithTenderly } from "lib/tenderly";
import { BlockTimestampData, adjustBlockTimestamp } from "lib/useBlockTimestampRequest";
import { convertTokenAddress } from "sdk/configs/tokens";
import {
  CustomErrorName,
  ErrorData,
  extendError,
  extractTxnError,
  isContractError,
  parseError,
} from "sdk/utils/errors";
import { CreateOrderTxnParams } from "sdk/utils/orderTransactions";

export type SimulateExecuteParams = {
  account: string;
  createMulticallPayload: string[];
  prices: SimulationPrices;
  value: bigint;
  method?:
    | "simulateExecuteLatestDeposit"
    | "simulateExecuteLatestWithdrawal"
    | "simulateExecuteLatestOrder"
    | "simulateExecuteLatestShift"
    | "simulateExecuteLatestGlvDeposit"
    | "simulateExecuteLatestGlvWithdrawal";
  swapPricingType?: SwapPricingType;
  blockTimestampData: BlockTimestampData | undefined;
};

export function isSimulationPassed(errorData: ErrorData) {
  return isContractError(errorData, CustomErrorName.EndOfOracleSimulation);
}

export async function simulateExecution(chainId: number, p: SimulateExecuteParams) {
  const provider = getProvider(undefined, chainId);

  const multicallAddress = getContract(chainId, "Multicall");

  const multicall = getMulticallContract(chainId, provider);
  const exchangeRouter = getExchangeRouterContract(chainId, provider);
  const glvRouter = isGlvEnabled(chainId) ? getGlvRouterContract(chainId, provider) : getZeroAddressContract(provider);

  let blockTimestamp: bigint;
  let blockTag: string | number;

  if (p.blockTimestampData) {
    blockTimestamp = adjustBlockTimestamp(p.blockTimestampData);
    blockTag = "latest";
  } else {
    const result = await multicall.blockAndAggregate.staticCall([
      { target: multicallAddress, callData: multicall.interface.encodeFunctionData("getCurrentBlockTimestamp") },
    ]);
    const returnValues = multicall.interface.decodeFunctionResult(
      "getCurrentBlockTimestamp",
      result.returnData[0].returnData
    );
    blockTimestamp = returnValues[0];
    blockTag = Number(result.blockNumber);
  }

  const priceTimestamp = blockTimestamp + 10n;
  const method = p.method || "simulateExecuteLatestOrder";

  const isGlv = method === "simulateExecuteLatestGlvDeposit" || method === "simulateExecuteLatestGlvWithdrawal";

  const simulationPriceParams = {
    primaryTokens: p.prices.primaryTokens,
    primaryPrices: p.prices.primaryPrices,
    minTimestamp: priceTimestamp,
    maxTimestamp: priceTimestamp,
  };

  let simulationPayloadData = [...p.createMulticallPayload];

  if (method === "simulateExecuteLatestWithdrawal") {
    if (p.swapPricingType === undefined) {
      throw new Error("swapPricingType is required for simulateExecuteLatestWithdrawal");
    }

    simulationPayloadData.push(
      exchangeRouter.interface.encodeFunctionData("simulateExecuteLatestWithdrawal", [
        simulationPriceParams,
        p.swapPricingType,
      ])
    );
  } else if (method === "simulateExecuteLatestDeposit") {
    simulationPayloadData.push(
      exchangeRouter.interface.encodeFunctionData("simulateExecuteLatestDeposit", [simulationPriceParams])
    );
  } else if (method === "simulateExecuteLatestOrder") {
    simulationPayloadData.push(
      exchangeRouter.interface.encodeFunctionData("simulateExecuteLatestOrder", [simulationPriceParams])
    );
  } else if (method === "simulateExecuteLatestShift") {
    simulationPayloadData.push(
      exchangeRouter.interface.encodeFunctionData("simulateExecuteLatestShift", [simulationPriceParams])
    );
  } else if (method === "simulateExecuteLatestGlvDeposit") {
    simulationPayloadData.push(
      glvRouter.interface.encodeFunctionData("simulateExecuteLatestGlvDeposit", [simulationPriceParams])
    );
  } else if (method === "simulateExecuteLatestGlvWithdrawal") {
    simulationPayloadData.push(
      glvRouter.interface.encodeFunctionData("simulateExecuteLatestGlvWithdrawal", [simulationPriceParams])
    );
  } else {
    throw new Error(`Unknown method: ${method}`);
  }

  const tenderlyConfig = getTenderlyConfig();
  const router = isGlv ? glvRouter : exchangeRouter;

  if (tenderlyConfig) {
    await simulateTxWithTenderly(chainId, router as BaseContract, p.account, "multicall", [simulationPayloadData], {
      value: p.value,
      comment: `calling ${method}`,
    });
  }

  try {
    await withRetry(
      () => {
        return router.multicall.staticCall(simulationPayloadData, {
          value: p.value,
          blockTag,
          from: p.account,
        });
      },
      {
        retryCount: 2,
        delay: 200,
        shouldRetry: ({ error }) => {
          const [message] = extractTxnError(error);
          return message?.includes("unsupported block number") ?? false;
        },
      }
    );
  } catch (txnError) {
    const errorData = parseError(txnError);

    if (errorData && isSimulationPassed(errorData)) {
      return;
    } else {
      throw extendError(txnError, {
        errorContext: "simulation",
      });
    }
  }
}

export function getOrdersTriggerPriceOverrides(createOrderPayloads: CreateOrderTxnParams<any>[]) {
  const overrides: PriceOverride[] = [];

  for (const co of createOrderPayloads) {
    if (co.orderPayload.numbers.triggerPrice !== 0n && "indexTokenAddress" in co.params) {
      overrides.push({
        tokenAddress: co.params.indexTokenAddress,
        contractPrices: {
          minPrice: co.orderPayload.numbers.triggerPrice,
          maxPrice: co.orderPayload.numbers.triggerPrice,
        },
      });
    }
  }

  return overrides;
}

export type SimulationPrices = ReturnType<typeof getSimulationPrices>;

export type PriceOverride = { tokenAddress: string; contractPrices?: TokenPrices; prices?: TokenPrices };

export function getSimulationPrices(chainId: number, tokensData: TokensData, overrides: PriceOverride[]) {
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

    const override = overrides.find((o) => o.tokenAddress === address);
    const primaryOverriddenPrice = override?.contractPrices ?? override?.prices;

    if (primaryOverriddenPrice) {
      primaryPrices.push({
        min: primaryOverriddenPrice.minPrice,
        max: primaryOverriddenPrice.maxPrice,
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
