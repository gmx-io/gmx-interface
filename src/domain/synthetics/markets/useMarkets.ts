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
    "0x6824C723F252B5EC911b186F428F9fe0eFba7E11": true,
    "0x5670eF8CDC5A0652735487091b2BE43EF8c60F68": true,
    "0x33CFc2F096057E1f950D83E8b7c8eE4c2e7c9eec": true,
    "0x6C63BBD727eA924FE79e441a88667d9e4Bc528C5": true,
    "0x7E5AC649E1E6471399D09be6f60c38246Ff409C9": true,
    "0xa88548591F6D9fFd86C8022022E39CcFb30e5Dd8": true,
  },
  [ARBITRUM_GOERLI]: {
    "0x6b3B6CAB5Cc605E5Fb312e5fBB6b2Ac3CA47f1cA": true,
    "0xD03f452046024d10FCF733E016DD451ecfA8bE81": true,
    "0x5BF821F3E457e15073ccedDe1E8B22ECc383B66F": true,
    "0x05225ff4f7c6637832527D4C37d14f36ccbe3477": true,
    "0x2eEE1e25e317Fb134812a6494512C2C6e45e5e9E": true,
    "0x1F9939015D76cb91b27B5A0c6dA9ad797005C12B": true,
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

  console.log("markets", data?.marketsData);

  return {
    marketsData: data?.marketsData,
    marketsAddresses: data?.marketsAddresses,
  };
}
