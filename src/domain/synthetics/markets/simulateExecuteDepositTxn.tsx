import { Web3Provider } from "@ethersproject/providers";
import { Trans, t } from "@lingui/macro";
import CustomErrors from "abis/CustomErrors.json";
import DataStore from "abis/DataStore.json";
import ExchangeRouter from "abis/ExchangeRouter.json";
import { ToastifyDebug } from "components/ToastifyDebug/ToastifyDebug";
import { getContract } from "config/contracts";
import { NONCE_KEY, orderKey } from "config/dataStore";
import { isDevelopment } from "config/env";
import { convertTokenAddress } from "config/tokens";
import { TokenPrices, TokensData, convertToContractPrice, getTokenData } from "domain/synthetics/tokens";
import { BigNumber, ethers } from "ethers";
import { callContract } from "lib/contracts";
import { getErrorMessage } from "lib/contracts/transactionErrors";
import { helperToast } from "lib/helperToast";

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
  method?: string;
};

// only for debugging empty reverts
const RUN_ON_CHAIN = false;

export async function simulateExecuteOrderTxn(chainId: number, library: Web3Provider, p: SimulateExecuteOrderParams) {
  const dataStoreAddress = getContract(chainId, "DataStore");

  const dataStore = new ethers.Contract(dataStoreAddress, DataStore.abi, library.getSigner());

  const exchangeRouter = new ethers.Contract(
    getContract(chainId, "ExchangeRouter"),
    ExchangeRouter.abi,
    library.getSigner()
  );

  const blockNumber = await library.getBlockNumber();
  const nonce = await dataStore.getUint(NONCE_KEY, { blockTag: blockNumber });
  const nextNonce = nonce.add(1);
  const nextKey = orderKey(dataStoreAddress, nextNonce);

  const { primaryTokens, primaryPrices, secondaryTokens, secondaryPrices } = getSimulationPrices(
    chainId,
    p.tokensData,
    p.primaryPriceOverrides,
    p.secondaryPriceOverrides
  );

  const simulationPayload = [
    ...p.createOrderMulticallPayload,
    exchangeRouter.interface.encodeFunctionData(p.method || "simulateExecuteOrder", [
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
    if (RUN_ON_CHAIN && isDevelopment()) {
      const txn = await callContract(chainId, exchangeRouter, "multicall", [simulationPayload], {
        value: p.value,
        gasLimit: 13 ** 6,
      });

      throw new Error(`debug simulation ended ${txn.hash}`);
    } else {
      await exchangeRouter.callStatic.multicall(simulationPayload, {
        value: p.value,
        blockTag: blockNumber,
        gasLimit: 10 * 10 ** 6,
      });
    }
  } catch (txnError) {
    const customErrors = new ethers.Contract(ethers.constants.AddressZero, CustomErrors.abi);

    let msg: any = undefined;

    try {
      const parsedError = customErrors.interface.parseError(txnError.data?.data);
      const isSimulationPassed = parsedError.name === "EndOfOracleSimulation";

      if (isSimulationPassed) {
        return;
      }

      const parsedArgs = Object.keys(parsedError.args).reduce((acc, k) => {
        if (!Number.isNaN(Number(k))) {
          return acc;
        }
        acc[k] = parsedError.args[k].toString();
        return acc;
      }, {});

      msg = (
        <div>
          <Trans>Execute order simulation failed.</Trans>
          <br />
          <ToastifyDebug>
            {parsedError.name} {JSON.stringify(parsedArgs, null, 2)}
          </ToastifyDebug>
        </div>
      );
    } catch (e) {
      const walletErrorMessage = getErrorMessage(chainId, txnError, t`Execute order simulation failed.`);
      msg = walletErrorMessage.failMsg;
    }

    if (!msg) {
      msg = (
        <div>
          <Trans>Execute order simulation failed.</Trans>
          <br />
          <ToastifyDebug>Unknown Error</ToastifyDebug>
        </div>
      );
    }

    helperToast.error(msg);

    throw txnError;
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

    const convertedAddress = convertTokenAddress(chainId, address, "wrapped");

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

  return {
    primaryTokens,
    secondaryTokens: primaryTokens,
    primaryPrices,
    secondaryPrices,
  };
}
