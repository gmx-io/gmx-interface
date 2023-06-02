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
    "0x81A076DBf71Bb46D414203bf31b2E519189E29c7": true,
    "0x33CFc2F096057E1f950D83E8b7c8eE4c2e7c9eec": true,
    "0xd111A46943F588309cdddB64Fa8eB033B53d0Ff9": true,
    "0x3D500c62294aB071Da5a2aE9A11C8d386B9bE5A8": true,
    "0xb6088c08f05a2B3b3a0Cc5f8198DAEA8b2fB8629": true,
    "0xB9bc5B9A2401F5ED866ee27e80De01da88291215": true,
  },
  [ARBITRUM_GOERLI]: {
    // "0x6b3B6CAB5Cc605E5Fb312e5fBB6b2Ac3CA47f1cA": true,
    // "0xD03f452046024d10FCF733E016DD451ecfA8bE81": true,
    // "0x5BF821F3E457e15073ccedDe1E8B22ECc383B66F": true,
    // "0x05225ff4f7c6637832527D4C37d14f36ccbe3477": true,
    // "0x2eEE1e25e317Fb134812a6494512C2C6e45e5e9E": true,
    // "0x1F9939015D76cb91b27B5A0c6dA9ad797005C12B": true,
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
      return res.reader.markets.returnValues.reduce(
        (acc: { marketsData: MarketsData; marketsAddresses: string[] }, marketValues) => {
          const [marketTokenAddress, indexTokenAddress, longTokenAddress, shortTokenAddress, data] = marketValues;

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
              data,
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

  // console.log("markets", data?.marketsData);

  return {
    marketsData: data?.marketsData,
    marketsAddresses: data?.marketsAddresses,
  };
}
