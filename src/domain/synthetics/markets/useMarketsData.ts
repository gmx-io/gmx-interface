import SyntheticsReader from "abis/SyntheticsReader.json";
import { getContract } from "config/contracts";
import { useMulticall } from "lib/multicall";
import { MarketsData } from "./types";
import { convertTokenAddress, getToken } from "config/tokens";
import { getMarketFullName } from "./utils";

type MarketsDataResult = {
  marketsData: MarketsData;
  marketsAddresses: string[];
  isLoading: boolean;
};

const MARKETS_COUNT = 100;

const defaultValue = {
  marketsData: {},
  marketsAddresses: [],
};

export function useMarketsData(chainId: number): MarketsDataResult {
  const { data = defaultValue, isLoading } = useMulticall(chainId, "useMarketsData", {
    key: [],
    request: () => ({
      reader: {
        contractAddress: getContract(chainId, "SyntheticsReader"),
        abi: SyntheticsReader.abi,
        calls: {
          markets: {
            methodName: "getMarkets",
            params: [getContract(chainId, "DataStore"), 0, MARKETS_COUNT],
          },
        },
      },
    }),
    parseResponse: (res) => {
      return res.reader.markets.returnValues.reduce(
        (acc: { marketsData: MarketsData; marketsAddresses: string[] }, marketValues) => {
          const [marketTokenAddress, indexTokenAddress, longTokenAddress, shortTokenAddress, data] = marketValues;

          try {
            const indexToken = getToken(chainId, convertTokenAddress(chainId, indexTokenAddress, "native"));
            const longToken = getToken(chainId, longTokenAddress);
            const shortToken = getToken(chainId, shortTokenAddress);

            acc.marketsData[marketTokenAddress] = {
              marketTokenAddress,
              indexTokenAddress,
              longTokenAddress,
              shortTokenAddress,
              data,
              name: getMarketFullName({ indexToken, longToken, shortToken }),
            };

            acc.marketsAddresses.push(marketTokenAddress);
          } catch (e) {
            // ignore parsing errors on unknown tokens
          }

          return acc;
        },
        { marketsData: {}, marketsAddresses: [] }
      );
    },
  });

  return {
    marketsData: data.marketsData,
    marketsAddresses: data.marketsAddresses,
    isLoading,
  };
}
