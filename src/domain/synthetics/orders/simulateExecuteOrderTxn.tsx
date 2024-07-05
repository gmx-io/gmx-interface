import { Trans, t } from "@lingui/macro";
import CustomErrors from "abis/CustomErrors.json";
import { ToastifyDebug } from "components/ToastifyDebug/ToastifyDebug";
import { getContract } from "config/contracts";
import { NONCE_KEY, orderKey } from "config/dataStore";
import { convertTokenAddress } from "config/tokens";
import { TokenPrices, TokensData, convertToContractPrice, getTokenData } from "domain/synthetics/tokens";
import { ethers } from "ethers";
import { getErrorMessage } from "lib/contracts/transactionErrors";
import { helperToast } from "lib/helperToast";
import { getProvider } from "lib/rpc";
import { getTenderlyConfig, simulateTxWithTenderly } from "lib/tenderly";
import { Multicall__factory, DataStore__factory, ExchangeRouter__factory } from "typechain-types";

export type MulticallRequest = { method: string; params: any[] }[];

export type PriceOverrides = {
  [address: string]: TokenPrices | undefined;
};

type SimulateExecuteOrderParams = {
  account: string;
  createOrderMulticallPayload: string[];
  primaryPriceOverrides: PriceOverrides;
  tokensData: TokensData;
  value: bigint;
  method?: string;
  errorTitle?: string;
  extraArgs?: any[];
};

export async function simulateExecuteOrderTxn(chainId: number, p: SimulateExecuteOrderParams) {
  const provider = getProvider(undefined, chainId);

  const dataStoreAddress = getContract(chainId, "DataStore");
  const multicallAddress = getContract(chainId, "Multicall");
  const exchangeRouterAddress = getContract(chainId, "ExchangeRouter");

  const dataStore = DataStore__factory.connect(dataStoreAddress, provider);
  const multicall = Multicall__factory.connect(multicallAddress, provider);
  const exchangeRouter = ExchangeRouter__factory.connect(exchangeRouterAddress, provider);

  const result = await multicall.blockAndAggregate.staticCall([
    { target: dataStoreAddress, callData: dataStore.interface.encodeFunctionData("getUint", [NONCE_KEY]) },
    { target: multicallAddress, callData: multicall.interface.encodeFunctionData("getCurrentBlockTimestamp") },
  ]);

  const blockNumber = result.blockNumber;

  const [nonce] = dataStore.interface.decodeFunctionResult("getUint", result.returnData[0].returnData);
  const [blockTimestamp] = multicall.interface.decodeFunctionResult(
    "getCurrentBlockTimestamp",
    result.returnData[1].returnData
  );

  const nextNonce = nonce + 1n;
  const nextKey = orderKey(dataStoreAddress, nextNonce);

  const { primaryTokens, primaryPrices } = getSimulationPrices(chainId, p.tokensData, p.primaryPriceOverrides);
  const priceTimestamp = blockTimestamp + 5n;
  const method = p.method || "simulateExecuteOrder";

  const simulationPayload = [
    ...p.createOrderMulticallPayload,
    exchangeRouter.interface.encodeFunctionData(method, [
      nextKey,
      {
        primaryTokens: primaryTokens,
        primaryPrices: primaryPrices,
        minTimestamp: priceTimestamp,
        maxTimestamp: priceTimestamp,
      },
      ...(p.extraArgs ?? []),
    ] as any),
  ];

  const errorTitle = p.errorTitle || t`Execute order simulation failed.`;

  const tenderlyConfig = getTenderlyConfig();

  if (tenderlyConfig) {
    await simulateTxWithTenderly(chainId, exchangeRouter, p.account, "multicall", [simulationPayload], {
      value: p.value,
      comment: `calling ${method}`,
    });
  }

  try {
    await exchangeRouter.multicall.staticCall(simulationPayload, {
      value: p.value,
      blockTag: blockNumber,
      from: p.account,
    });
  } catch (txnError) {
    const customErrors = new ethers.Contract(ethers.ZeroAddress, CustomErrors.abi);

    let msg: any = undefined;

    try {
      const errorData = extractDataFromError(txnError?.info?.error?.message) ?? extractDataFromError(txnError?.message);

      if (!errorData) throw new Error("No data found in error.");

      const parsedError = customErrors.interface.parseError(errorData);
      const isSimulationPassed = parsedError?.name === "EndOfOracleSimulation";

      if (isSimulationPassed) {
        return;
      }

      const parsedArgs = Object.keys(parsedError?.args ?? []).reduce((acc, k) => {
        if (!Number.isNaN(Number(k))) {
          return acc;
        }
        acc[k] = parsedError?.args[k].toString();
        return acc;
      }, {});

      msg = (
        <div>
          {errorTitle}
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

      const commonError = getErrorMessage(chainId, txnError, errorTitle);
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

export function extractDataFromError(errorMessage: unknown) {
  if (typeof errorMessage !== "string") return null;

  const pattern = /data="([^"]+)"/;
  const match = errorMessage.match(pattern);

  if (match && match[1]) {
    return match[1];
  }
  return null;
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

    const primaryOverridedPrice = primaryPricesMap[address];

    if (primaryOverridedPrice) {
      primaryPrices.push({
        min: convertToContractPrice(primaryOverridedPrice.minPrice, token.decimals),
        max: convertToContractPrice(primaryOverridedPrice.maxPrice, token.decimals),
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
