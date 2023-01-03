import { Web3Provider } from "@ethersproject/providers";
import DataStore from "abis/DataStore.json";
import ExchangeRouter from "abis/ExchangeRouter.json";
import { getContract } from "config/contracts";
import { getConvertedTokenAddress } from "config/tokens";
import { TokenPrices, TokensData, convertToContractPrice, getTokenData } from "domain/synthetics/tokens";
import { BigNumber, ethers } from "ethers";
import { NONCE, orderKey } from "domain/synthetics/dataStore";
import { helperToast } from "lib/helperToast";
import { Trans } from "@lingui/macro";
import { ToastifyDebug } from "components/ToastifyDebug/ToastifyDebug";

export type MulticallRequest = { method: string; params: any[] }[];

export type SecondaryPricesMap = {
  [address: string]: TokenPrices;
};

type SimulateExecuteOrderParams = {
  createOrderMulticallPayload: string[];
  secondaryPricesMap: SecondaryPricesMap;
  tokensData: TokensData;
  value: BigNumber;
};

const SUCCESS_SIMULATION_PATTERN = "End of oracle price simulation";

export async function simulateExecuteOrderTxn(chainId: number, library: Web3Provider, p: SimulateExecuteOrderParams) {
  const dataStore = new ethers.Contract(getContract(chainId, "DataStore"), DataStore.abi, library.getSigner());

  const exchangeRouter = new ethers.Contract(
    getContract(chainId, "ExchangeRouter"),
    ExchangeRouter.abi,
    library.getSigner()
  );

  const blockNumber = await library.getBlockNumber();
  const nonce = await dataStore.getUint(NONCE, { blockTag: blockNumber });
  const nextNonce = nonce.add(1);
  const nextKey = orderKey(nextNonce);

  const { primaryTokens, primaryPrices, secondaryTokens, secondaryPrices } = getSimulationPrices(
    chainId,
    p.tokensData,
    p.secondaryPricesMap
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
    await exchangeRouter.callStatic.multicall(simulationPayload, { value: p.value });
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

function getSimulationPrices(chainId: number, tokensData: TokensData, secondaryPricesMap: SecondaryPricesMap) {
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

    const primaryPrice = {
      min: convertToContractPrice(token.prices.minPrice, token.decimals),
      max: convertToContractPrice(token.prices.maxPrice, token.decimals),
    };

    primaryPrices.push(primaryPrice);

    const secondaryOverridedPrice = secondaryPricesMap[address];

    if (secondaryOverridedPrice) {
      secondaryPrices.push({
        min: convertToContractPrice(secondaryOverridedPrice.minPrice, token.decimals),
        max: convertToContractPrice(secondaryOverridedPrice.maxPrice, token.decimals),
      });
    } else {
      secondaryPrices.push(primaryPrice);
    }
  }

  return {
    primaryTokens,
    secondaryTokens: primaryTokens,
    primaryPrices,
    secondaryPrices,
  };
}
