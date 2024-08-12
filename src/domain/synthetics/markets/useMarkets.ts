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
            acc.marketsData["0xb56E5E2eB50cf5383342914b0C85Fe62DbD861C8"] = {
              marketTokenAddress: "0xb56E5E2eB50cf5383342914b0C85Fe62DbD861C8",
              indexTokenAddress: "0x0000000000000000000000000000000000000000",
              longTokenAddress: "0x5979D7b546E38E414F7E9822514be443A4800529",
              shortTokenAddress: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
              isSameCollaterals: false,
              isSpotOnly: false,
              name: "XYZ",
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
    marketsAddresses: data?.marketsAddresses.concat("0xb56E5E2eB50cf5383342914b0C85Fe62DbD861C8"),
  };
}
