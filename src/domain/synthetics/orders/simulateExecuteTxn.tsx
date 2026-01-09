import { Trans, t } from "@lingui/macro";
import { ReactNode } from "react";
import { ContractFunctionParameters, decodeErrorResult, encodeFunctionData, withRetry } from "viem";

import { getContract } from "config/contracts";
import { SwapPricingType } from "domain/synthetics/orders";
import { TokenPrices, TokensData, convertToContractPrice, getTokenData } from "domain/synthetics/tokens";
import { helperToast } from "lib/helperToast";
import { OrderMetricId } from "lib/metrics/types";
import { sendOrderSimulatedMetric, sendTxnErrorMetric } from "lib/metrics/utils";
import { getTenderlyConfig, simulateTxWithTenderly } from "lib/tenderly";
import { BlockTimestampData, adjustBlockTimestamp } from "lib/useBlockTimestampRequest";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { abis } from "sdk/abis";
import type { ContractsChainId } from "sdk/configs/chains";
import { convertTokenAddress } from "sdk/configs/tokens";
import { ExternalSwapQuote } from "sdk/types/trade";
import { CustomErrorName, ErrorData, extractDataFromError, extractTxnError, isContractError } from "sdk/utils/errors";

import { getErrorMessage } from "components/Errors/errorToasts";
import { ToastifyDebug } from "components/ToastifyDebug/ToastifyDebug";

import { getBlockTimestampAndNumber } from "./simulation";
import { isGlvEnabled } from "../markets/glv";

export type PriceOverrides = {
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

export function isSimulationPassed(errorData: ErrorData) {
  return isContractError(errorData, CustomErrorName.EndOfOracleSimulation);
}

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
    typeof abis.ExchangeRouter,
    "payable",
    "simulateExecuteLatestWithdrawal"
  >["args"][0];

  let simulationPayloadData = [...p.createMulticallPayload];

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

  let errorTitle = p.errorTitle || t`Execute order simulation failed.`;

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
          const [message] = extractTxnError(error);
          return message?.includes("unsupported block number") ?? false;
        },
      }
    );
  } catch (txnError) {
    let msg: React.ReactNode = undefined;

    try {
      const errorData = extractDataFromError(txnError?.info?.error?.message) ?? extractDataFromError(txnError?.message);
      const error = new Error("No data found in error.");
      error.cause = txnError;
      if (!errorData) throw error;

      const parsedError = decodeErrorResult({
        abi: abis.CustomErrors,
        data: errorData,
      });

      const isSimulationPassed = parsedError.errorName === "EndOfOracleSimulation";

      if (isSimulationPassed) {
        if (p.metricId) {
          sendOrderSimulatedMetric(p.metricId);
        }
        return;
      }

      if (p.metricId) {
        sendTxnErrorMetric(p.metricId, txnError, "simulation");
      }

      const parsedArgs = Object.keys(parsedError?.args ?? []).reduce((acc, k) => {
        if (!Number.isNaN(Number(k))) {
          return acc;
        }
        acc[k] = parsedError?.args[k].toString();
        return acc;
      }, {});

      let errorContent: ReactNode = errorTitle;
      if (
        parsedError.errorName === CustomErrorName.OrderNotFulfillableAtAcceptablePrice ||
        parsedError.errorName === CustomErrorName.InsufficientSwapOutputAmount
      ) {
        errorContent = (
          <Trans>
            Order error. Prices are currently volatile for this market, try again by{" "}
            <span
              onClick={() => {
                if (p.additionalErrorParams?.slippageInputId) {
                  document.getElementById(p.additionalErrorParams?.slippageInputId)?.focus();
                }
              }}
              className={p.additionalErrorParams?.slippageInputId ? "cursor-pointer underline" : undefined}
            >
              <Trans>increasing the allowed slippage</Trans>
            </span>{" "}
            under the advanced display section.
          </Trans>
        );
      }

      msg = (
        <div>
          {errorContent}
          {p.additionalErrorParams?.content}
          <br />
          <br />
          <ToastifyDebug
            error={`${txnError?.info?.error?.message ?? parsedError.errorName ?? txnError?.message} ${JSON.stringify(parsedArgs, null, 2)}`}
          />
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
          <Trans>Execute order simulation failed.</Trans>
          <br />
          <br />
          <ToastifyDebug error={t`Unknown Error`} />
        </div>
      );
    }

    helperToast.error(msg);

    throw txnError;
  }
}

export function getSimulationPrices(chainId: number, tokensData: TokensData, primaryPricesMap: PriceOverrides) {
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
