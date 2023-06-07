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

const DISABLED_MARKETS = {
  [AVALANCHE_FUJI]: {
    // "0x81A076DBf71Bb46D414203bf31b2E519189E29c7": true,
    // "0x33CFc2F096057E1f950D83E8b7c8eE4c2e7c9eec": true,
    // "0xd111A46943F588309cdddB64Fa8eB033B53d0Ff9": true,
    // "0x3D500c62294aB071Da5a2aE9A11C8d386B9bE5A8": true,
    // "0xb6088c08f05a2B3b3a0Cc5f8198DAEA8b2fB8629": true,
    // "0xB9bc5B9A2401F5ED866ee27e80De01da88291215": true,
  },
  [ARBITRUM_GOERLI]: {
    "0x056a0d631920D8A37EacA2521911072F7a5c33F9": true,
    "0x9F551A599FB0584739eDC641634F244e89100d0c": true,
    "0x577a79FB4e5c9987fe41A4DD84ca54Df54Ba8431": true,
    "0x47E80247037722B762dc0B516Cb47dCb061ad56A": true,
    "0x1AF827a3E41F6648757270Ba3C7bD74563666bBd": true,
    "0xb590091Eb0EB48259475f17c812743218Fe772f5": true,
    "0xF95A9B0B47D560EDCce67356B3d6aEA0cA15CfBd": true,
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
      return res.reader.markets.returnValues[0].reduce(
        (acc: { marketsData: MarketsData; marketsAddresses: string[] }, marketValues) => {
          const [marketTokenAddress, indexTokenAddress, longTokenAddress, shortTokenAddress] = marketValues;

          if (DISABLED_MARKETS[chainId]?.[marketTokenAddress]) {
            return acc;
          }

          try {
            const indexToken = getToken(chainId, convertTokenAddress(chainId, indexTokenAddress, "native"));
            const longToken = getToken(chainId, longTokenAddress);
            const shortToken = getToken(chainId, shortTokenAddress);

            const isSameCollaterals = longTokenAddress === shortTokenAddress;
            const isSpotOnly = indexTokenAddress === ethers.constants.AddressZero;

            const name = getMarketFullName({ indexToken, longToken, shortToken, isSpotOnly });

            acc.marketsData[marketTokenAddress] = {
              marketTokenAddress,
              indexTokenAddress,
              longTokenAddress,
              shortTokenAddress,
              isSameCollaterals,
              isSpotOnly,
              name,
              data: "",
            };

            acc.marketsAddresses.push(marketTokenAddress);
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
