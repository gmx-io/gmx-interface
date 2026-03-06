import { Trans, t } from "@lingui/macro";
import { ReactNode } from "react";
import { ContractFunctionParameters, encodeFunctionData, withRetry } from "viem";

import { getContract, tryGetContract } from "config/contracts";
import { SwapPricingType } from "domain/synthetics/orders";
import { TokenPrices, TokensData, convertToContractPrice, getTokenData } from "domain/synthetics/tokens";
import { decodeErrorFromViemError } from "lib/errors";
import { helperToast } from "lib/helperToast";
import { OrderMetricId } from "lib/metrics/types";
import { sendOrderSimulatedMetric, sendTxnErrorMetric } from "lib/metrics/utils";
import { getTenderlyConfig, simulateTxWithTenderly } from "lib/tenderly";
import { BlockTimestampData, adjustBlockTimestamp } from "lib/useBlockTimestampRequest";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { abis } from "sdk/abis";
import type { ContractsChainId } from "sdk/configs/chains";
import { convertTokenAddress } from "sdk/configs/tokens";
import { CustomErrorName } from "sdk/utils/errors";
import { ExternalSwapQuote } from "sdk/utils/trade/types";

import { getErrorMessage } from "components/Errors/errorToasts";
import { ToastifyDebug } from "components/ToastifyDebug/ToastifyDebug";

import { getBlockTimestampAndNumber, isTemporaryError } from "./simulation";
import { isGlvEnabled } from "../markets/glv";

type PriceOverrides = {
  [address: string]: TokenPrices | undefined;
};

export type SimulateExecuteParams = {
  account: string;
  createMulticallPayload: string[];
  primaryPriceOverrides: PriceOverrides;
  tokensData: TokensData;
  value: bigint;
  method?:
    | "simulateExecuteLatestDeposit"
    | "simulateExecuteLatestWithdrawal"
    | "simulateExecuteLatestOrder"
    | "simulateExecuteLatestShift"
    | "simulateExecuteLatestGlvDeposit"
    | "simulateExecuteLatestGlvWithdrawal";
  errorTitle?: string;
  swapPricingType?: SwapPricingType;
  metricId?: OrderMetricId;
  blockTimestampData: BlockTimestampData | undefined;
  additionalErrorParams?: {
    content?: React.ReactNode;
    slippageInputId?: string;
  };
  externalSwapQuote?: ExternalSwapQuote;
};

/**
 * @deprecated use simulateExecution instead
 */
export async function simulateExecuteTxn(chainId: ContractsChainId, p: SimulateExecuteParams) {
  const client = getPublicClientWithRpc(chainId);

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

  const { primaryTokens, primaryPrices } = getSimulationPrices(chainId, p.tokensData, p.primaryPriceOverrides);
  const priceTimestamp = blockTimestamp + 120n;
  const method = p.method || "simulateExecuteLatestOrder";

  const isGlv = method === "simulateExecuteLatestGlvDeposit" || method === "simulateExecuteLatestGlvWithdrawal";
  if (isGlv && !useGlvRouter) {
    throw new Error("GlvRouter is not enabled for this chain");
  }

  const simulationPriceParams = {
    primaryTokens: primaryTokens,
    primaryPrices: primaryPrices,
    minTimestamp: priceTimestamp,
    maxTimestamp: priceTimestamp,
  } satisfies ContractFunctionParameters<
    typeof abis.SimulationRouter,
    "payable",
    "simulateExecuteLatestWithdrawal"
  >["args"][0];

  let simulationPayloadData = [...p.createMulticallPayload];

  let simulateExecuteData: string;

  if (method === "simulateExecuteLatestWithdrawal") {
    if (p.swapPricingType === undefined) {
      throw new Error("swapPricingType is required for simulateExecuteLatestWithdrawal");
    }

    simulateExecuteData = encodeFunctionData({
      abi: abis.SimulationRouter,
      functionName: "simulateExecuteLatestWithdrawal",
      args: [simulationPriceParams, p.swapPricingType],
    });
  } else if (method === "simulateExecuteLatestDeposit") {
    simulateExecuteData = encodeFunctionData({
      abi: abis.SimulationRouter,
      functionName: "simulateExecuteLatestDeposit",
      args: [simulationPriceParams],
    });
  } else if (method === "simulateExecuteLatestOrder") {
    simulateExecuteData = encodeFunctionData({
      abi: abis.SimulationRouter,
      functionName: "simulateExecuteLatestOrder",
      args: [simulationPriceParams],
    });
  } else if (method === "simulateExecuteLatestShift") {
    simulateExecuteData = encodeFunctionData({
      abi: abis.SimulationRouter,
      functionName: "simulateExecuteLatestShift",
      args: [simulationPriceParams],
    });
  } else if (method === "simulateExecuteLatestGlvDeposit") {
    simulateExecuteData = encodeFunctionData({
      abi: abis.GlvRouter,
      functionName: "simulateExecuteLatestGlvDeposit",
      args: [simulationPriceParams],
    });
  } else if (method === "simulateExecuteLatestGlvWithdrawal") {
    simulateExecuteData = encodeFunctionData({
      abi: abis.GlvRouter,
      functionName: "simulateExecuteLatestGlvWithdrawal",
      args: [simulationPriceParams],
    });
  } else {
    throw new Error(`Unknown method: ${method}`);
  }

  simulationPayloadData.push(simulateExecuteData);

  const simulationRouterAddress = !isGlv ? tryGetContract(chainId, "SimulationRouter") : undefined;

  let errorTitle = p.errorTitle || t`Order simulation failed`;

  const tenderlyConfig = getTenderlyConfig();

  const retryConfig = {
    retryCount: 2,
    delay: 200,
    shouldRetry: ({ error }: { error: Error }) => {
      return isTemporaryError(error);
    },
  };

  if (isGlv) {
    // GLV path: everything goes to GlvRouter
    const routerAddress = getContract(chainId, "GlvRouter");
    const routerAbi = abis.GlvRouter;

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
        retryConfig
      );
    } catch (txnError) {
      handleSimulationTxnError(txnError, chainId, p, errorTitle);
    }
  } else if (simulationRouterAddress) {
    // v2.2c: SimulationRouter is available.
    // Create calls go to ExchangeRouter, simulate call goes to SimulationRouter.
    const exchangeRouterAddress = getContract(chainId, "ExchangeRouter");

    // Step 1: Simulate the create payload on ExchangeRouter to validate it
    if (tenderlyConfig) {
      await simulateTxWithTenderly({
        chainId,
        address: exchangeRouterAddress,
        abi: abis.ExchangeRouter,
        account: p.account,
        method: "multicall",
        params: [simulationPayloadData.slice(0, -1)],
        value: p.value,
        comment: `calling create for ${method}`,
      });
    }

    try {
      await withRetry(
        () => {
          return client.simulateContract({
            address: exchangeRouterAddress,
            abi: abis.ExchangeRouter,
            functionName: "multicall",
            args: [simulationPayloadData.slice(0, -1)],
            value: p.value,
            account: p.account,
            blockNumber: blockNumber,
          });
        },
        retryConfig
      );
    } catch (createError) {
      // For create-only simulation, any revert is an actual error
      handleSimulationTxnError(createError, chainId, p, errorTitle);
    }

    // Step 2: Simulate execution on SimulationRouter
    if (tenderlyConfig) {
      await simulateTxWithTenderly({
        chainId,
        address: simulationRouterAddress,
        abi: abis.SimulationRouter,
        account: p.account,
        method: "multicall",
        params: [[simulateExecuteData]],
        value: 0n,
        comment: `calling ${method}`,
      });
    }

    try {
      await withRetry(
        () => {
          return client.simulateContract({
            address: simulationRouterAddress,
            abi: abis.SimulationRouter,
            functionName: "multicall",
            args: [[simulateExecuteData]],
            value: 0n,
            account: p.account,
            blockNumber: blockNumber,
          });
        },
        retryConfig
      );
    } catch (txnError) {
      handleSimulationTxnError(txnError, chainId, p, errorTitle);
    }
  } else {
    // Legacy: ExchangeRouter still has simulation methods
    const routerAddress = getContract(chainId, "ExchangeRouter");
    const routerAbi = abis.ExchangeRouter;

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
        retryConfig
      );
    } catch (txnError) {
      handleSimulationTxnError(txnError, chainId, p, errorTitle);
    }
  }
}

function handleSimulationTxnError(
  txnError: any,
  chainId: ContractsChainId,
  p: SimulateExecuteParams,
  errorTitle: string
): never | void {
  let msg: React.ReactNode = undefined;

  try {
    const parsedError = decodeErrorFromViemError(txnError);
    if (!parsedError) {
      const error = new Error("No data found in error.");
      error.cause = txnError;
      throw error;
    }

    const isSimulationPassed = parsedError.name === CustomErrorName.EndOfOracleSimulation;

    if (isSimulationPassed) {
      if (p.metricId) {
        sendOrderSimulatedMetric(p.metricId);
      }
      return;
    }

    if (p.metricId) {
      sendTxnErrorMetric(p.metricId, txnError, "simulation");
    }

    const parsedArgs = parsedError.args;

    let errorContent: ReactNode = errorTitle;
    if (
      parsedError.name === CustomErrorName.OrderNotFulfillableAtAcceptablePrice ||
      parsedError.name === CustomErrorName.InsufficientSwapOutputAmount
    ) {
      errorContent = (
        <Trans>
          Prices are volatile.{" "}
          <span
            onClick={() => {
              if (p.additionalErrorParams?.slippageInputId) {
                document.getElementById(p.additionalErrorParams?.slippageInputId)?.focus();
              }
            }}
            className={p.additionalErrorParams?.slippageInputId ? "cursor-pointer underline" : undefined}
          >
            Increase allowed slippage
          </span>
        </Trans>
      );
    }

    msg = (
      <div>
        {errorContent}
        {p.additionalErrorParams?.content}
        <br />
        <br />
        <ToastifyDebug error={`${parsedError.name ?? txnError?.message} ${JSON.stringify(parsedArgs, null, 2)}`} />
      </div>
    );
  } catch (parsingError) {
    // eslint-disable-next-line no-console
    console.error(parsingError);

    const commonError = getErrorMessage(chainId, txnError, errorTitle, p.additionalErrorParams?.content);
    msg = commonError.failMsg;
  }

  if (!msg) {
    msg = (
      <div>
        <Trans>Order simulation failed</Trans>
        <br />
        <br />
        <ToastifyDebug error={t`Unknown error`} />
      </div>
    );
  }

  helperToast.error(msg);

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
