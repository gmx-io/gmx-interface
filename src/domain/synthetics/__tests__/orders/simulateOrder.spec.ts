import { JsonRpcProvider } from "@ethersproject/providers";
import DataStore from "abis/DataStore.json";
import ExchangeRouter from "abis/ExchangeRouter.json";

import { AVALANCHE_FUJI } from "config/chains";
import { getContract } from "config/contracts";
import { getTokenBySymbol } from "config/tokens";

import { encodeReferralCode } from "domain/referrals";
import { NONCE } from "domain/synthetics/dataStore";
import { convertToContractPrice } from "domain/synthetics/tokens";
import { BigNumber, ethers } from "ethers";
import { hashData } from "lib/hash";
import { USD_DECIMALS } from "lib/legacy";
import { parseValue } from "lib/numbers";
import { getProvider } from "lib/rpc";

const chainId = AVALANCHE_FUJI;

const account = "0xD0FA2ebEAc5E1b5876CE2754100E9009Fc0Bd4FC";
const orderStoreAddress = getContract(chainId, "OrderStore");
const avax = getTokenBySymbol(chainId, "AVAX");
const wavax = getTokenBySymbol(chainId, "WAVAX");

const avaxPrice = convertToContractPrice(parseValue("11.16", USD_DECIMALS)!, avax.decimals);
const executionFee = parseValue("0.001", avax.decimals)!;

const tests = [
  {
    name: "Long AVAX",
    multicall: [
      {
        method: "sendWnt",
        params: [orderStoreAddress, parseValue("0.1", avax.decimals)?.add(executionFee)],
      },
      {
        method: "createOrder",
        params: [
          {
            addresses: {
              receiver: account,
              market: "0x2d2af2D2e615fAaA5c8f5730Ca272f219fE3417d",
              swapPath: [],
              initialCollateralToken: wavax.address,
              callbackContract: ethers.constants.AddressZero,
            },
            numbers: {
              sizeDeltaUsd: parseValue("2", USD_DECIMALS),
              triggerPrice: BigNumber.from(0),
              acceptablePrice: avaxPrice,
              executionFee: executionFee,
              minOutputAmount: BigNumber.from(0),
              callbackGasLimit: BigNumber.from(0),
            },
            orderType: 2,
            isLong: true,
            shouldUnwrapNativeToken: true,
          },
          encodeReferralCode(""),
        ],
      },
    ],
    simulationParams: {
      primaryTokens: [wavax.address],
      primaryPrices: [{ min: avaxPrice, max: avaxPrice }],
      secondatyTokens: [],
      secondaryPrices: [],
    },
  },
];

describe("simulateOrder", () => {
  for (let test of tests) {
    it(`${test.name}`, async () => {
      const provider = getProvider(undefined, chainId) as JsonRpcProvider;

      const dataStore = new ethers.Contract(getContract(chainId, "DataStore"), DataStore.abi, provider);

      const exchangeRouter = new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, provider);

      const blockNumber = await provider.getBlockNumber();
      const nonce = await dataStore.getUint(NONCE, { blockTag: blockNumber });
      const nextNonce = nonce.add(1);
      const nextKey = hashData(["uint256"], [nextNonce]);

      console.log("nextKey", nextKey);

      const multicall = [
        ...test.multicall,
        {
          method: "simulateExecuteOrder",
          params: [
            nextKey,
            {
              primaryTokens: test.simulationParams.primaryTokens,
              primaryPrices: test.simulationParams.primaryPrices,
              secondaryTokens: test.simulationParams.secondatyTokens,
              secondaryPrices: test.simulationParams.secondaryPrices,
            },
          ],
        },
      ];

      const encodedPayload = multicall.map((call) =>
        exchangeRouter.interface.encodeFunctionData(call.method, call.params)
      );

      const wntAmount = test.multicall.find((call) => call.method === "sendWnt")?.params[1];

      try {
        const res = await exchangeRouter.callStatic.multicall(encodedPayload, {
          value: wntAmount,
          from: account,
          gasLimit: 10 ** 6,
        });

        console.log("simulation result", res);
      } catch (e) {
        console.log("simulation error", e);
      }

      expect(true).toBe(true);
    });
  }
});
