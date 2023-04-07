import SyntheticsReader from "abis/SyntheticsReader.json";
import { getContract } from "config/contracts";
import { useMulticall } from "lib/multicall";
import { MarketsData } from "./types";
import { ethers } from "ethers";

type MarketsDataResult = {
  marketsData: MarketsData;
  isLoading: boolean;
};

const DEFAULT_COUNT = 100;

const defaultValue = {};

export function useMarketsData(chainId: number): MarketsDataResult {
  const startIndex = 0;
  const endIndex = DEFAULT_COUNT;

  const { data = defaultValue, isLoading } = useMulticall(chainId, "useMarketsData", {
    key: [startIndex, endIndex],
    request: () => ({
      reader: {
        contractAddress: getContract(chainId, "SyntheticsReader"),
        abi: SyntheticsReader.abi,
        calls: {
          markets: {
            methodName: "getMarkets",
            params: [getContract(chainId, "DataStore"), startIndex, endIndex],
          },
        },
      },
    }),
    parseResponse: (res) => {
      const markets = res.reader.markets.returnValues;

      return markets.reduce((acc: MarketsData, market) => {
        const [marketTokenAddress, indexTokenAddress, longTokenAddress, shortTokenAddress, data] = market;

        const isSameCollaterals = longTokenAddress === shortTokenAddress;
        const isSpotOnly = indexTokenAddress === ethers.constants.AddressZero;

        try {
          acc[marketTokenAddress] = {
            marketTokenAddress,
            indexTokenAddress,
            longTokenAddress,
            shortTokenAddress,
            isSameCollaterals,
            isSpotOnly,
            data,
            // TODO: store in configs?
            perp: "USD",
          };
        } catch (e) {
          // ignore parsing errors on unknown tokens
        }

        return acc;
      }, {} as MarketsData);
    },
  });

  return {
    marketsData: data,
    isLoading,
  };
}
