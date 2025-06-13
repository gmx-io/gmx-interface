import { Trans, t } from "@lingui/macro";
import { BaseContract, ethers } from "ethers";
import { ReactNode } from "react";
import { withRetry } from "viem";

import { CustomErrorsAbi } from "ab/testMultichain/getCustomErrorsAbi/getCustomErrorsAbi";
import {
  getContract,
  getExchangeRouterContract,
  getGlvRouterContract,
  getMulticallContract,
  getZeroAddressContract,
} from "config/contracts";
import { SwapPricingType } from "domain/synthetics/orders";
import { TokenPrices, TokensData, convertToContractPrice, getTokenData } from "domain/synthetics/tokens";
import { helperToast } from "lib/helperToast";
import { OrderMetricId } from "lib/metrics/types";
import { sendOrderSimulatedMetric, sendTxnErrorMetric } from "lib/metrics/utils";
import { getProvider } from "lib/rpc";
import { getTenderlyConfig, simulateTxWithTenderly } from "lib/tenderly";
import { BlockTimestampData, adjustBlockTimestamp } from "lib/useBlockTimestampRequest";
import type { ContractsChainId } from "sdk/configs/chains";
import { convertTokenAddress } from "sdk/configs/tokens";
import { ExternalSwapQuote } from "sdk/types/trade";
import { CustomErrorName, ErrorData, extractDataFromError, extractTxnError, isContractError } from "sdk/utils/errors";
import { OracleUtils } from "typechain-types/ExchangeRouter";

import { getErrorMessage } from "components/Errors/errorToasts";
import { ToastifyDebug } from "components/ToastifyDebug/ToastifyDebug";

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

  const { primaryTokens, primaryPrices } = getSimulationPrices(chainId, p.tokensData, p.primaryPriceOverrides);
  const priceTimestamp = blockTimestamp + 30n;
  const method = p.method || "simulateExecuteLatestOrder";

  const isGlv = method === "simulateExecuteLatestGlvDeposit" || method === "simulateExecuteLatestGlvWithdrawal";

  const simulationPriceParams = {
    primaryTokens: primaryTokens,
    primaryPrices: primaryPrices,
    minTimestamp: priceTimestamp,
    maxTimestamp: priceTimestamp,
  } as OracleUtils.SimulatePricesParamsStruct;

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

  let errorTitle = p.errorTitle || t`Execute order simulation failed.`;

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
    const customErrors = new ethers.Contract(ethers.ZeroAddress, CustomErrorsAbi);
    let msg: React.ReactNode = undefined;

    try {
      const errorData = extractDataFromError(txnError?.info?.error?.message) ?? extractDataFromError(txnError?.message);
      const error = new Error("No data found in error.");
      error.cause = txnError;
      if (!errorData) throw error;

      const parsedError = customErrors.interface.parseError(errorData);
      const isSimulationPassed = parsedError?.name === "EndOfOracleSimulation";

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
        parsedError?.name === CustomErrorName.OrderNotFulfillableAtAcceptablePrice ||
        parsedError?.name === CustomErrorName.InsufficientSwapOutputAmount
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
            error={`${txnError?.info?.error?.message ?? parsedError?.name ?? txnError?.message} ${JSON.stringify(parsedArgs, null, 2)}`}
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
