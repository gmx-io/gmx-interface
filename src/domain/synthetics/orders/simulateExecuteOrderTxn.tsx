import { JsonRpcProvider } from "@ethersproject/providers";
import { Trans, t } from "@lingui/macro";
import CustomErrors from "abis/CustomErrors.json";
import DataStore from "abis/DataStore.json";
import ExchangeRouter from "abis/ExchangeRouter.json";
import { ToastifyDebug } from "components/ToastifyDebug/ToastifyDebug";
import { getContract } from "config/contracts";
import { NONCE_KEY, orderKey } from "config/dataStore";
import { convertTokenAddress } from "config/tokens";
import { TokenPrices, TokensData, convertToContractPrice, getTokenData } from "domain/synthetics/tokens";
import { BigNumber, ethers } from "ethers";
import { getErrorMessage } from "lib/contracts/transactionErrors";
import { helperToast } from "lib/helperToast";
import { getProvider } from "lib/rpc";

export type MulticallRequest = { method: string; params: any[] }[];

export type PriceOverrides = {
  [address: string]: TokenPrices | undefined;
};

type SimulateExecuteOrderParams = {
  account: string;
  createOrderMulticallPayload: string[];
  secondaryPriceOverrides: PriceOverrides;
  primaryPriceOverrides: PriceOverrides;
  tokensData: TokensData;
  value: BigNumber;
  method?: string;
  errorTitle?: string;
};

export async function simulateExecuteOrderTxn(chainId: number, p: SimulateExecuteOrderParams) {
  const dataStoreAddress = getContract(chainId, "DataStore");
  const provider = getProvider(undefined, chainId) as JsonRpcProvider;

  const dataStore = new ethers.Contract(dataStoreAddress, DataStore.abi, provider);

  const exchangeRouter = new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, provider);

  const blockNumber = await provider.getBlockNumber();
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

  const errorTitle = p.errorTitle || t`Execute order simulation failed.`;

  try {
    await exchangeRouter.callStatic.multicall(simulationPayload, {
      value: p.value,
      blockTag: blockNumber,
      from: p.account,
    });
  } catch (txnError) {
    const customErrors = new ethers.Contract(ethers.constants.AddressZero, CustomErrors.abi);

    let msg: any = undefined;

    try {
      const errorData = extractDataFromError(txnError.message);
      const parsedError = customErrors.interface.parseError(errorData);
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
          {errorTitle}
          <br />
          <ToastifyDebug>
            {parsedError.name} {JSON.stringify(parsedArgs, null, 2)}
          </ToastifyDebug>
        </div>
      );
    } catch (parsingError) {
      // eslint-disable-next-line no-console
      console.error(parsingError);

      const commonError = getErrorMessage(chainId, txnError, errorTitle);
      msg = commonError.failMsg;
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

function extractDataFromError(error_message) {
  const pattern = /data="([^"]+)"/;
  const match = error_message.match(pattern);

  if (match && match[1]) {
    return match[1];
  }
  return null;
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
    const convertedAddress = convertTokenAddress(chainId, address, "wrapped");

    if (!token?.prices || primaryTokens.includes(convertedAddress)) {
      continue;
    }

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
