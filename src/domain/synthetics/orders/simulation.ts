import { PublicClient, encodeFunctionData, withRetry } from "viem";

import { getContract } from "config/contracts";
import { isDevelopment } from "config/env";
import { SwapPricingType } from "domain/synthetics/orders";
import { TokenPrices, TokensData, convertToContractPrice, getTokenData } from "domain/synthetics/tokens";
import { SignedTokenPermit } from "domain/tokens";
import { getTenderlyConfig, simulateTxWithTenderly } from "lib/tenderly";
import { BlockTimestampData, adjustBlockTimestamp } from "lib/useBlockTimestampRequest";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { abis } from "sdk/abis";
import type { ContractsChainId } from "sdk/configs/chains";
import { convertTokenAddress } from "sdk/configs/tokens";
import { CustomErrorName, ErrorData, TxErrorType, extendError, isContractError, parseError } from "sdk/utils/errors";
import { CreateOrderTxnParams, ExternalCallsPayload } from "sdk/utils/orderTransactions";

import { isGlvEnabled } from "../markets/glv";

export type SimulateExecuteParams = {
  account: string;
  createMulticallPayload: string[];
  prices: SimulationPrices;
  value: bigint;
  tokenPermits: SignedTokenPermit[];
  isExpress: boolean;
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

export async function simulateExecution(chainId: ContractsChainId, p: SimulateExecuteParams) {
  let client: PublicClient;
  if (p.isExpress) {
    // Use alchemy rpc for express transactions simulation to increase reliability
    client = getPublicClientWithRpc(chainId, { withExpress: true });
  } else {
    client = getPublicClientWithRpc(chainId);
  }

  if (isDevelopment()) {
    // eslint-disable-next-line no-console
    console.log("simulation rpc", client.transport);
  }

  const multicallAddress = getContract(chainId, "Multicall");

  const useGlvRouter = isGlvEnabled(chainId);

  let blockTimestamp: bigint;
  let blockNumber: bigint | undefined;

  if (p.blockTimestampData) {
    blockTimestamp = adjustBlockTimestamp(p.blockTimestampData);
  } else {
    const [blockTimestampResult, currentBlockNumberResult] = await client.multicall({
      multicallAddress,
      contracts: [
        {
          address: multicallAddress,
          abi: abis.Multicall,
          functionName: "getCurrentBlockTimestamp",
        },
        {
          address: multicallAddress,
          abi: abis.Multicall,
          functionName: "getBlockNumber",
        },
      ],
    });

    blockTimestamp = blockTimestampResult.result!;
    blockNumber = currentBlockNumberResult.result!;
  }

  const priceTimestamp = blockTimestamp + 120n;
  const method = p.method || "simulateExecuteLatestOrder";

  const isGlv = method === "simulateExecuteLatestGlvDeposit" || method === "simulateExecuteLatestGlvWithdrawal";
  if (isGlv && !useGlvRouter) {
    throw new Error("GlvRouter is not enabled for this chain");
  }

  const simulationPriceParams = {
    primaryTokens: p.prices.primaryTokens,
    primaryPrices: p.prices.primaryPrices,
    minTimestamp: priceTimestamp,
    maxTimestamp: priceTimestamp,
  };

  let simulationPayloadData: string[] = [];

  if (p.tokenPermits.length > 0) {
    const externalCalls: ExternalCallsPayload = {
      sendTokens: [],
      sendAmounts: [],
      externalCallTargets: [],
      externalCallDataList: [],
      refundTokens: [],
      refundReceivers: [],
    };

    for (const permit of p.tokenPermits) {
      externalCalls.externalCallTargets.push(permit.token);
      externalCalls.externalCallDataList.push(
        encodeFunctionData({
          abi: abis.ERC20PermitInterface,
          functionName: "permit",
          args: [permit.owner, permit.spender, permit.value, permit.deadline, permit.v, permit.r, permit.s],
        })
      );
    }

    simulationPayloadData.push(
      encodeFunctionData({
        abi: abis.ExchangeRouter,
        functionName: "makeExternalCalls",
        args: [
          externalCalls.externalCallTargets,
          externalCalls.externalCallDataList,
          externalCalls.refundTokens,
          externalCalls.refundReceivers,
        ],
      })
    );
  }

  simulationPayloadData.push(...p.createMulticallPayload);

  if (method === "simulateExecuteLatestWithdrawal") {
    if (p.swapPricingType === undefined) {
      throw new Error("swapPricingType is required for simulateExecuteLatestWithdrawal");
    }

    simulationPayloadData.push(
      encodeFunctionData({
        abi: abis.ExchangeRouter,
        functionName: "simulateExecuteLatestWithdrawal",
        args: [simulationPriceParams, p.swapPricingType],
      })
    );
  } else if (method === "simulateExecuteLatestDeposit") {
    simulationPayloadData.push(
      encodeFunctionData({
        abi: abis.ExchangeRouter,
        functionName: "simulateExecuteLatestDeposit",
        args: [simulationPriceParams],
      })
    );
  } else if (method === "simulateExecuteLatestOrder") {
    simulationPayloadData.push(
      encodeFunctionData({
        abi: abis.ExchangeRouter,
        functionName: "simulateExecuteLatestOrder",
        args: [simulationPriceParams],
      })
    );
  } else if (method === "simulateExecuteLatestShift") {
    simulationPayloadData.push(
      encodeFunctionData({
        abi: abis.ExchangeRouter,
        functionName: "simulateExecuteLatestShift",
        args: [simulationPriceParams],
      })
    );
  } else if (method === "simulateExecuteLatestGlvDeposit") {
    simulationPayloadData.push(
      encodeFunctionData({
        abi: abis.GlvRouter,
        functionName: "simulateExecuteLatestGlvDeposit",
        args: [simulationPriceParams],
      })
    );
  } else if (method === "simulateExecuteLatestGlvWithdrawal") {
    simulationPayloadData.push(
      encodeFunctionData({
        abi: abis.GlvRouter,
        functionName: "simulateExecuteLatestGlvWithdrawal",
        args: [simulationPriceParams],
      })
    );
  } else {
    throw new Error(`Unknown method: ${method}`);
  }

  const tenderlyConfig = getTenderlyConfig();
  const routerAddress = isGlv ? getContract(chainId, "GlvRouter") : getContract(chainId, "ExchangeRouter");
  const routerAbi = isGlv ? abis.GlvRouter : abis.ExchangeRouter;

  if (tenderlyConfig) {
    await simulateTxWithTenderly({
      chainId,
      address: routerAddress,
      abi: routerAbi,
      account: p.account,
      method: "multicall",
      params: [simulationPayloadData],
      value: p.value,
      comment: `calling ${method}`,
    });
  }

  try {
    await withRetry(
      () => {
        return client.simulateContract({
          address: routerAddress,
          abi: routerAbi,
          functionName: "multicall",
          args: [simulationPayloadData],
          value: p.value,
          account: p.account,
          blockNumber: blockNumber,
        });
      },
      {
        retryCount: 2,
        delay: 200,
        shouldRetry: ({ error }) => {
          const errorData = parseError(error);
          return (
            errorData?.errorMessage?.includes("unsupported block number") ||
            errorData?.errorMessage?.toLowerCase().includes("failed to fetch") ||
            errorData?.errorMessage?.toLowerCase().includes("load failed") ||
            errorData?.errorMessage?.toLowerCase().includes("an error has occurred") ||
            false
          );
        },
      }
    );
  } catch (txnError) {
    const errorData = parseError(txnError);

    const isPassed = errorData && isSimulationPassed(errorData);
    const shouldIgnoreExpressNativeTokenBalance = errorData?.txErrorType === TxErrorType.NotEnoughFunds && p.isExpress;

    if (isPassed || shouldIgnoreExpressNativeTokenBalance) {
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
