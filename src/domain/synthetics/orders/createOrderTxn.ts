import { JsonRpcProvider, Web3Provider } from "@ethersproject/providers";
import { getContract } from "config/contracts";
import { BigNumber, ethers } from "ethers";
import ExchangeRouter from "abis/ExchangeRouter.json";
import DataStore from "abis/DataStore.json";
import { getCorrectTokenAddress, getToken, NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { encodeReferralCode } from "domain/referrals";
import { TokenPrices, convertToContractPrice } from "../tokens";
import { OrderType, orderTypeLabels } from "config/synthetics";
import { NONCE } from "../dataStore";
import { getProvider } from "lib/rpc";
import { hashData } from "lib/hash";
import { callContract } from "lib/contracts";
import { t } from "@lingui/macro";

type CommonParams = {
  account: string;
  executionFee: BigNumber;
  referralCode?: string;
  simulationPrimaryPrices: { [address: string]: TokenPrices };
};

type PositionParams = CommonParams & {
  marketAddress: string;
  swapPath: string[];
  initialCollateralAddress: string;
  initialCollateralAmount: BigNumber;
  indexTokenAddress: string;
  triggerPrice?: BigNumber;
  acceptablePrice: BigNumber;
  sizeDeltaUsd: BigNumber;
  isLong: boolean;
  orderType: OrderType.MarketIncrease | OrderType.LimitIncrease;
};

type SwapParams = CommonParams & {
  initialCollateralAddress: string;
  initialCollateralAmount: BigNumber;
  swapPath: string[];
  receiveTokenAddress: string;
  minOutputAmount: BigNumber;
  orderType: OrderType.MarketSwap | OrderType.LimitSwap;
};

type Params = PositionParams | SwapParams;

export async function createOrderTxn(chainId: number, library: Web3Provider, p: Params) {
  const provider = getProvider(undefined, chainId) as JsonRpcProvider;

  const dataStore = new ethers.Contract(getContract(chainId, "DataStore"), DataStore.abi, library.getSigner());

  const exchnangeRouter = new ethers.Contract(
    getContract(chainId, "ExchangeRouter"),
    ExchangeRouter.abi,
    library.getSigner()
  );

  const blockNumber = await provider.getBlockNumber();

  console.log("blockNumber", blockNumber);

  const nonce = await dataStore.getUint(NONCE, { blockTag: blockNumber });
  const nextNonce = nonce.add(1);
  const nextKey = hashData(["uint256"], [nextNonce]);

  const orderStoreAddress = getContract(chainId, "OrderStore");

  const isNativePayment = p.initialCollateralAddress === NATIVE_TOKEN_ADDRESS;

  const wntAmount = p.executionFee.add(isNativePayment ? p.initialCollateralAmount : BigNumber.from(0));

  const isSwapOrder = p.orderType === OrderType.MarketSwap || p.orderType === OrderType.LimitSwap;

  const txnParams = isSwapOrder ? getSwapTxnParams(p) : getPositionTxnParams(chainId, p as PositionParams);

  const multicall = [
    { method: "sendWnt", params: [orderStoreAddress, wntAmount] },

    !isNativePayment
      ? { method: "sendTokens", params: [p.initialCollateralAddress, orderStoreAddress, p.initialCollateralAmount] }
      : undefined,

    {
      method: "createOrder",
      params: [
        {
          addresses: {
            receiver: p.account,
            initialCollateralToken: getCorrectTokenAddress(chainId, p.initialCollateralAddress, "wrapped"),
            callbackContract: ethers.constants.AddressZero,
            market: txnParams.market,
            swapPath: p.swapPath,
            executionFee: p.executionFee,
            callbackGasLimit: BigNumber.from(0),
          },
          numbers: {
            sizeDeltaUsd: txnParams.sizeDeltaUsd,
            triggerPrice: txnParams.triggerPrice,
            acceptablePrice: txnParams.acceptablePrice,
            executionFee: p.executionFee,
            callbackGasLimit: BigNumber.from(0),
            minOutputAmount: txnParams.minOutputAmount,
          },
          orderType: p.orderType,
          isLong: txnParams.isLong,
          shouldUnwrapNativeToken: txnParams.shouldUnwrapNativeToken,
        },
        encodeReferralCode(p.referralCode || ""),
      ],
    },
  ];

  const simulationPrimaryParams = getSimulationPricesParams(chainId, p.simulationPrimaryPrices);

  console.log("simulationPrimaryParams", simulationPrimaryParams, p.simulationPrimaryPrices);

  const sumulateMulticall = [
    ...multicall,
    {
      method: "simulateExecuteOrder",
      params: [
        nextKey,
        {
          primaryTokens: simulationPrimaryParams.addresses,
          primaryPrices: simulationPrimaryParams.prices,
          secondaryTokens: [],
          secondaryPrices: [],
        },
      ],
    },
  ];

  // eslint-disable-next-line no-console
  console.log("simulate multicall", sumulateMulticall);

  const encodedSimulationPayload = sumulateMulticall
    .filter(Boolean)
    .map((call) => exchnangeRouter.interface.encodeFunctionData(call!.method, call!.params));

  try {
    await exchnangeRouter.callStatic.multicall(encodedSimulationPayload, {
      gasLimit: 10 ** 6,
      blockTag: blockNumber,
      value: wntAmount,
    });
  } catch (e) {
    console.log("simulation error", e);
  }

  const encodedPayload = multicall
    .filter(Boolean)
    .map((call) => exchnangeRouter.interface.encodeFunctionData(call!.method, call!.params));

  // eslint-disable-next-line no-console
  console.log("multicall", multicall);

  const orderLabel = orderTypeLabels[p.orderType];

  return callContract(chainId, exchnangeRouter, "multicall", [encodedPayload], {
    value: wntAmount,
    gasLimit: 10 ** 6,
    sentMsg: t`${orderLabel} order sent`,
    successMsg: t`Success ${orderLabel} order`,
    failMsg: t`${orderLabel} order failed`,
  });
}

function getSwapTxnParams(p: SwapParams) {
  const isNativeReceive = p.receiveTokenAddress === NATIVE_TOKEN_ADDRESS;

  return {
    market: ethers.constants.AddressZero,
    sizeDeltaUsd: BigNumber.from(0),
    triggerPrice: BigNumber.from(0),
    acceptablePrice: BigNumber.from(0),
    minOutputAmount: p.minOutputAmount.div(2),
    isLong: false,
    shouldUnwrapNativeToken: isNativeReceive,
  };
}

function getPositionTxnParams(chainId: number, p: PositionParams) {
  const indexToken = getToken(chainId, p.indexTokenAddress);

  const acceptablePrice = convertToContractPrice(p.acceptablePrice || BigNumber.from(0), indexToken.decimals);
  const triggerPrice = convertToContractPrice(p.triggerPrice || BigNumber.from(0), indexToken.decimals);

  return {
    market: p.marketAddress,
    sizeDeltaUsd: p.sizeDeltaUsd,
    triggerPrice: triggerPrice,
    acceptablePrice,
    minOutputAmount: BigNumber.from(0),
    isLong: p.isLong,
    shouldUnwrapNativeToken: false,
  };
}

function getSimulationPricesParams(chainId: number, pricesMap: { [address: string]: TokenPrices }) {
  const addresses = Object.keys(pricesMap);
  const prices = addresses.map((address) => {
    const { decimals } = getToken(chainId, address);
    const prices = pricesMap[address];

    return {
      min: convertToContractPrice(prices.minPrice, decimals),
      max: convertToContractPrice(prices.maxPrice, decimals),
    };
  });

  return {
    addresses,
    prices,
  };
}
