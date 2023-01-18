import { Web3Provider } from "@ethersproject/providers";
import DataStore from "abis/DataStore.json";
import ExchangeRouter from "abis/ExchangeRouter.json";
import { getContract } from "config/contracts";
import { getConvertedTokenAddress } from "config/tokens";
import {
  TokenPrices,
  TokensData,
  convertToContractPrice,
  formatUsdAmount,
  getTokenData,
} from "domain/synthetics/tokens";
import { BigNumber, ethers } from "ethers";
import _ from "lodash";
import { NONCE_KEY, orderKey } from "config/dataStore";
import { helperToast } from "lib/helperToast";
import { Trans } from "@lingui/macro";
import { ToastifyDebug } from "components/ToastifyDebug/ToastifyDebug";
import { expandDecimals } from "lib/numbers";
import { callContract } from "lib/contracts";
import { isDevelopment } from "config/env";

export type MulticallRequest = { method: string; params: any[] }[];

export type PriceOverrides = {
  [address: string]: TokenPrices | undefined;
};

type SimulateExecuteOrderParams = {
  createOrderMulticallPayload: string[];
  secondaryPriceOverrides: PriceOverrides;
  primaryPriceOverrides: PriceOverrides;
  tokensData: TokensData;
  value: BigNumber;
};

const SUCCESS_SIMULATION_PATTERN = "End of oracle price simulation";

// only for debugging empty reverts
const SHOULD_MINE = false;

export async function simulateExecuteOrderTxn(chainId: number, library: Web3Provider, p: SimulateExecuteOrderParams) {
  const dataStore = new ethers.Contract(getContract(chainId, "DataStore"), DataStore.abi, library.getSigner());

  const exchangeRouter = new ethers.Contract(
    getContract(chainId, "ExchangeRouter"),
    ExchangeRouter.abi,
    library.getSigner()
  );

  const blockNumber = await library.getBlockNumber();
  const nonce = await dataStore.getUint(NONCE_KEY, { blockTag: blockNumber });
  const nextNonce = nonce.add(1);
  const nextKey = orderKey(nextNonce);

  const { primaryTokens, primaryPrices, secondaryTokens, secondaryPrices } = getSimulationPrices(
    chainId,
    p.tokensData,
    p.primaryPriceOverrides,
    p.secondaryPriceOverrides
  );

  const simulationPayload = [
    ...p.createOrderMulticallPayload,
    exchangeRouter.interface.encodeFunctionData("simulateExecuteOrder", [
      nextKey,
      {
        primaryTokens: primaryTokens,
        primaryPrices: primaryPrices,
        secondaryTokens: secondaryTokens,
        secondaryPrices: secondaryPrices,
      },
    ]),
  ];

  try {
    if (SHOULD_MINE && isDevelopment()) {
      const txn = await callContract(chainId, exchangeRouter, "multicall", [simulationPayload], {
        value: p.value,
        gasLimit: 12 ** 6,
      });

      throw new Error(`debug simulation ended ${txn.hash}`);
    } else {
      await exchangeRouter.callStatic.multicall(simulationPayload, { value: p.value, blockTag: blockNumber });
    }
  } catch (e) {
    if (e.data?.message.includes(SUCCESS_SIMULATION_PATTERN)) {
      return undefined;
    } else {
      const originalError = e.data?.error?.message || e.data?.message || e.message;

      helperToast.error(
        <div>
          <Trans>Execute order simulation failed.</Trans>
          <br />
          {originalError && <ToastifyDebug>{originalError}</ToastifyDebug>}
        </div>
      );
    }

    throw e;
  }
}

function getSimulationPrices(
  chainId: number,
  tokensData: TokensData,
  primaryPricesMap: PriceOverrides,
  secondaryPricesMap: PriceOverrides
) {
  const tokenAddresses = Object.keys(tokensData);

  const primaryTokens: string[] = [];
  const primaryPrices: { min: BigNumber; max: BigNumber }[] = [];
  const secondaryPrices: { min: BigNumber; max: BigNumber }[] = [];

  for (const address of tokenAddresses) {
    const token = getTokenData(tokensData, address);

    if (!token?.prices) {
      continue;
    }

    const convertedAddress = getConvertedTokenAddress(chainId, address, "wrapped");

    primaryTokens.push(convertedAddress);

    const currentPrice = {
      min: convertToContractPrice(token.prices.minPrice, token.decimals),
      max: convertToContractPrice(token.prices.maxPrice, token.decimals),
    };

    const primaryOverridedPrice = primaryPricesMap[address];

    if (primaryOverridedPrice) {
      primaryPrices.push({
        min: convertToContractPrice(primaryOverridedPrice.minPrice, token.decimals),
        max: convertToContractPrice(primaryOverridedPrice.maxPrice, token.decimals),
      });
    } else {
      primaryPrices.push(currentPrice);
    }

    const secondaryOverridedPrice = secondaryPricesMap[address];

    if (secondaryOverridedPrice) {
      secondaryPrices.push({
        min: convertToContractPrice(secondaryOverridedPrice.minPrice, token.decimals),
        max: convertToContractPrice(secondaryOverridedPrice.maxPrice, token.decimals),
      });
    } else {
      secondaryPrices.push(currentPrice);
    }
  }

  // eslint-disable-next-line no-console
  console.log("prices", {
    primaryPricesMap: _.mapValues(primaryPricesMap, (v) => ({
      min: formatUsdAmount(v?.minPrice),
      max: formatUsdAmount(v?.maxPrice),
    })),
    secondaryPricesMap: _.mapValues(secondaryPricesMap, (v) => ({
      min: formatUsdAmount(v?.minPrice),
      max: formatUsdAmount(v?.maxPrice),
    })),
    primaryPrices: primaryPrices.map((v) => ({
      min: formatUsdAmount(v.min.mul(expandDecimals(1, 18))),
      max: formatUsdAmount(v.max.mul(expandDecimals(1, 18))),
    })),
    secondaryPrices: secondaryPrices.map((v) => ({
      min: formatUsdAmount(v.min.mul(expandDecimals(1, 18))),
      max: formatUsdAmount(v.max.mul(expandDecimals(1, 18))),
    })),
  });

  return {
    primaryTokens,
    secondaryTokens: primaryTokens,
    primaryPrices,
    secondaryPrices,
  };
}
