import SyntheticsReader from "abis/SyntheticsReader.json";
import { getContract } from "config/contracts";
import { useMulticall } from "lib/multicall";
import { MarketsData } from "./types";
import { convertTokenAddress, getToken } from "config/tokens";
import { getMarketFullName } from "./utils";
import { ethers } from "ethers";
import { ARBITRUM_GOERLI, AVALANCHE_FUJI } from "config/chains";

type MarketsResult = {
  marketsData?: MarketsData;
  marketsAddresses?: string[];
};

const MARKETS_COUNT = 100;

//  "0x64b77721FAb0D37b84f0A2D1B78ddE5892d46a8D": false,

const DISABLED_MARKETS = {
  [AVALANCHE_FUJI]: {
    // "0x81A076DBf71Bb46D414203bf31b2E519189E29c7": true,
    // "0xd111A46943F588309cdddB64Fa8eB033B53d0Ff9": true,
    // "0x3D500c62294aB071Da5a2aE9A11C8d386B9bE5A8": true,
    // "0xb6088c08f05a2B3b3a0Cc5f8198DAEA8b2fB8629": true,
    // "0xB9bc5B9A2401F5ED866ee27e80De01da88291215": true,
    // "0xac575be6f40b37BB1fc43d9A273cD289e8f36c8D": true,
    "0x64b77721FAb0D37b84f0A2D1B78ddE5892d46a8D": true,
    // "0x9F4C3f7C073C1b80977396B1505513b23236982B": true,
  },
  [ARBITRUM_GOERLI]: {
    // "0x056a0d631920D8A37EacA2521911072F7a5c33F9": true,
    // "0x9F551A599FB0584739eDC641634F244e89100d0c": true,
    // "0x577a79FB4e5c9987fe41A4DD84ca54Df54Ba8431": true,
    // "0x47E80247037722B762dc0B516Cb47dCb061ad56A": true,
    // "0x1AF827a3E41F6648757270Ba3C7bD74563666bBd": true,
    // "0xb590091Eb0EB48259475f17c812743218Fe772f5": true,
    // "0xF95A9B0B47D560EDCce67356B3d6aEA0cA15CfBd": true,
    // "0x418DcfC6e1af5536B6295b9807C304a12DAEd9ef": true,
  },
};

export function useMarkets(chainId: number): MarketsResult {
  const { data } = useMulticall(chainId, "useMarketsData", {
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
      return res.data.reader.markets.returnValues.reduce(
        (acc: { marketsData: MarketsData; marketsAddresses: string[] }, marketValues) => {
          if (DISABLED_MARKETS[chainId]?.[marketValues.marketToken]) {
            return acc;
          }

          try {
            const indexToken = getToken(chainId, convertTokenAddress(chainId, marketValues.indexToken, "native"));
            const longToken = getToken(chainId, marketValues.longToken);
            const shortToken = getToken(chainId, marketValues.shortToken);

            const isSameCollaterals = marketValues.longToken === marketValues.shortToken;
            const isSpotOnly = marketValues.indexToken === ethers.constants.AddressZero;

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
