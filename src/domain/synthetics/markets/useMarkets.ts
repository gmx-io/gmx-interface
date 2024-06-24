import SyntheticsReader from "abis/SyntheticsReader.json";
import { getContract } from "config/contracts";
import { convertTokenAddress, getToken } from "config/tokens";
import { isMarketEnabled } from "config/markets";
import { ethers } from "ethers";
import { useMulticall } from "lib/multicall";
import { MarketsData } from "./types";
import { getMarketFullName } from "./utils";

export type MarketsResult = {
  marketsData?: MarketsData;
  marketsAddresses?: string[];
};

const MARKETS_COUNT = 100;

export function useMarkets(chainId: number): MarketsResult {
  const { data } = useMulticall(chainId, "useMarketsData", {
    key: [chainId],

    refreshInterval: 60000,

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
      return res.data.reader.markets.returnValues.reduce(
        (acc: { marketsData: MarketsData; marketsAddresses: string[] }, marketValues) => {
          if (!isMarketEnabled(chainId, marketValues.marketToken)) {
            return acc;
          }

          try {
            const indexToken = getToken(chainId, convertTokenAddress(chainId, marketValues.indexToken, "native"));
            const longToken = getToken(chainId, marketValues.longToken);
            const shortToken = getToken(chainId, marketValues.shortToken);

            const isSameCollaterals = marketValues.longToken === marketValues.shortToken;
            const isSpotOnly = marketValues.indexToken === ethers.ZeroAddress;

            const name = getMarketFullName({ indexToken, longToken, shortToken, isSpotOnly });

            acc.marketsData[marketValues.marketToken] = {
              marketTokenAddress: marketValues.marketToken,
              indexTokenAddress: marketValues.indexToken,
              longTokenAddress: marketValues.longToken,
              shortTokenAddress: marketValues.shortToken,
              isSameCollaterals,
              isSpotOnly,
              name,
              data: "",
            };

            acc.marketsAddresses.push(marketValues.marketToken);
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn("unsupported market", e);
          }

          return acc;
        },
        { marketsData: {}, marketsAddresses: [] }
      );
    },
  });

  return {
    marketsData: data?.marketsData,
    marketsAddresses: data?.marketsAddresses,
  };
}
