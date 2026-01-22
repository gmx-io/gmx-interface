import {
  ContractFunctionRevertedError,
  HttpRequestError,
  InsufficientFundsError,
  PublicClient,
  RpcRequestError,
  TimeoutError,
  BaseError as ViemBaseError,
  WebSocketRequestError,
  encodeFunctionData,
  withRetry,
} from "viem";

import { getContract } from "config/contracts";
import { isDevelopment } from "config/env";
import { SwapPricingType } from "domain/synthetics/orders";
import { TokenPrices, TokensData, convertToContractPrice, getTokenData } from "domain/synthetics/tokens";
import { SignedTokenPermit } from "domain/tokens";
import { decodeErrorFromViemError } from "lib/errors";
import { getTenderlyConfig, simulateTxWithTenderly } from "lib/tenderly";
import { BlockTimestampData, adjustBlockTimestamp } from "lib/useBlockTimestampRequest";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { abis } from "sdk/abis";
import { type ContractsChainId } from "sdk/configs/chains";
import { convertTokenAddress } from "sdk/configs/tokens";
import { CustomError, CustomErrorName, extendError } from "sdk/utils/errors";
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

export function isInsufficientFundsError(error: any): boolean {
  return Boolean(
    "walk" in error &&
      typeof error.walk === "function" &&
      (error as ViemBaseError).walk(
        (e: any) => e instanceof InsufficientFundsError || ("name" in e && e.name === "InsufficientFundsError")
      )
  );
}

const TEMPORARY_ERROR_PATTERNS = [
  "header not found",
  "unfinalized data",
  "networkerror when attempting to fetch resource",
  "the request timed out",
  "unsupported block number",
  "failed to fetch",
  "load failed",
  "an error has occurred",
];

export function isTemporaryError(error: any): boolean {
  if (!("walk" in error && typeof error.walk === "function")) {
    return false;
  }

  const errorChain = error as ViemBaseError;
  let isTemporary: boolean | undefined;

  errorChain.walk((e: any) => {
    const errorName = e?.name;

    if (errorName === "ContractFunctionRevertedError" || e instanceof ContractFunctionRevertedError) {
      isTemporary = false;
      return true;
    }

    if (
      e instanceof HttpRequestError ||
      e instanceof WebSocketRequestError ||
      e instanceof TimeoutError ||
      errorName === "HttpRequestError" ||
      errorName === "WebSocketRequestError" ||
      errorName === "TimeoutError"
    ) {
      isTemporary = true;
      return true;
    }

    if (e instanceof RpcRequestError || errorName === "RpcRequestError" || errorName === "RpcError") {
      const code = (e as RpcRequestError)?.code;
      if (code === -32001 || code === -32002 || code === -32603) {
        isTemporary = true;
        return true;
      }
    }

    const errorText = [
      typeof e?.details === "string" ? e.details : undefined,
      typeof e?.shortMessage === "string" ? e.shortMessage : undefined,
      typeof e?.message === "string" ? e.message : undefined,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (errorText && TEMPORARY_ERROR_PATTERNS.some((pattern) => errorText.includes(pattern))) {
      isTemporary = true;
      return true;
    }

    return false;
  });

  return isTemporary === true;
}

export async function getBlockTimestampAndNumber(
  client: PublicClient,
  multicallAddress: string
): Promise<{ blockTimestamp: bigint; blockNumber: bigint }> {
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

  if (blockTimestampResult.result === undefined) {
    throw new Error("Failed to get block timestamp from multicall");
  }

  if (currentBlockNumberResult.result === undefined) {
    throw new Error("Failed to get block number from multicall");
  }

  return {
    blockTimestamp: blockTimestampResult.result,
    blockNumber: currentBlockNumberResult.result,
  };
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
    const result = await getBlockTimestampAndNumber(client, multicallAddress);
    blockTimestamp = result.blockTimestamp;
    blockNumber = result.blockNumber;
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
          return isTemporaryError(error);
        },
      }
    );
  } catch (txnError) {
    const decodedError = decodeErrorFromViemError(txnError);

    const isPassed = decodedError?.name === CustomErrorName.EndOfOracleSimulation;

    const isInsufficientFunds = isInsufficientFundsError(txnError);
    const shouldIgnoreExpressNativeTokenBalance = isInsufficientFunds && p.isExpress;

    if (isPassed || shouldIgnoreExpressNativeTokenBalance) {
      return;
    } else {
      throw extendError(
        decodedError
          ? new CustomError({
              name: decodedError.name,
              message: JSON.stringify(decodedError, null, 2),
              args: decodedError.args,
            })
          : txnError,
        {
          errorContext: "simulation",
        }
      );
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

type SimulationPrices = ReturnType<typeof getSimulationPrices>;

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
