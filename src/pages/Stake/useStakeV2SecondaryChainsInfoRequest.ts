import { ARBITRUM, AVALANCHE, CHAIN_IDS_WITH_GMX } from "config/chains";
import { getContract } from "config/contracts";
import { getTokenBySymbol } from "config/tokens";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getGmxPriceFromArbtitrum, getGmxPriceFromAvalanche } from "domain/legacy";
import type { MulticallResult } from "lib/multicall/types";
import { useMulticallMany } from "lib/multicall/useMulticallMany";

import UniPool from "abis/UniPool.json";
import UniswapV2 from "abis/UniswapV2.json";
import Vault from "abis/Vault.json";

const request = (chainId: number) => ({
  // vaultTokenInfo: {
  //   abi: VaultReader.abi,

  //   contractAddress: getContract(chainId, "VaultReader"),
  //   calls: {
  //     getVaultTokenInfoV4: {
  //       methodName: "getVaultTokenInfoV4",
  //       params: [
  //         getContract(chainId, "Vault"),
  //         getContract(chainId, "PositionRouter"),
  //         getContract(chainId, "NATIVE_TOKEN"),
  //         expandDecimals(1, 18),
  //         getWhitelistedV1Tokens(chainId).map((token) => token.address),
  //       ],
  //     },
  //   },
  // },
  // readerV2: {
  //   abi: ReaderV2.abi,
  //   contractAddress: getContract(chainId, "Reader"),
  //   calls: {
  //     getFees: {
  //       methodName: "getFees",
  //       params: [getContract(chainId, "Vault"), getWhitelistedV1Tokens(chainId).map((token) => token.address)],
  //     },
  //   },
  // },
  // gmxBalances: {
  //   abi: Token.abi,
  //   contractAddress: getContract(chainId, "GMX"),
  //   calls: {
  //     dex: {
  //       methodName: "balanceOf",
  //       params: [getContract(chainId, chainId === ARBITRUM ? "UniswapGmxEthPool" : "TraderJoeGmxAvaxPool")],
  //     },
  //     staked: {
  //       methodName: "balanceOf",
  //       params: [getContract(chainId, "StakedGmxTracker")],
  //     },
  //   },
  // },
  vault: {
    abi: Vault.abi,
    contractAddress: getContract(chainId, "Vault"),
    calls: {
      minPrice: {
        methodName: "getMinPrice",
        params: [getTokenBySymbol(chainId, chainId === ARBITRUM ? "WETH" : "WAVAX").address],
      },
    },
  },
  gmxDexRaw:
    chainId === ARBITRUM
      ? {
          abi: UniPool.abi,
          contractAddress: getContract(ARBITRUM, "UniswapGmxEthPool"),
          calls: {
            uniPoolSlot0: {
              methodName: "slot0",
              params: [],
            },
          },
        }
      : {
          abi: UniswapV2.abi,
          contractAddress: getContract(AVALANCHE, "UniswapGmxEthPool"),
          calls: {
            getReserves: {
              methodName: "getReserves",
              params: [],
            },
          },
        },
});

const parseResponse = (
  result: MulticallResult<ReturnType<typeof request>>,
  chainId: number
): {
  gmxPrice: bigint | undefined;
} => {
  const nativePrice = result.data.vault.minPrice.returnValues[0] as bigint;

  return {
    // vaultTokenInfo: result.data.vaultTokenInfo.getVaultTokenInfoV4.returnValues as bigint[],
    // fees: result.data.readerV2.getFees.returnValues as bigint[],
    // gmxLiquidity: result.data.gmxBalances.dex.returnValues[0] as bigint,
    // gmxStaked: result.data.gmxBalances.staked.returnValues[0] as bigint,
    gmxPrice:
      chainId === ARBITRUM
        ? getGmxPriceFromArbtitrum(getTokenBySymbol(ARBITRUM, "WETH").address, nativePrice, {
            sqrtPriceX96: result.data.gmxDexRaw.uniPoolSlot0!.returnValues[0] as bigint,
            tick: result.data.gmxDexRaw.uniPoolSlot0!.returnValues[1] as bigint,
            observationIndex: result.data.gmxDexRaw.uniPoolSlot0!.returnValues[2] as bigint,
            observationCardinality: result.data.gmxDexRaw.uniPoolSlot0!.returnValues[3] as bigint,
            observationCardinalityNext: result.data.gmxDexRaw.uniPoolSlot0!.returnValues[4] as bigint,
            feeProtocol: result.data.gmxDexRaw.uniPoolSlot0!.returnValues[5] as bigint,
            unlocked: result.data.gmxDexRaw.uniPoolSlot0!.returnValues[6] as boolean,
          })
        : getGmxPriceFromAvalanche(
            result.data.gmxDexRaw.getReserves!.returnValues[0] as bigint,
            result.data.gmxDexRaw.getReserves!.returnValues[1] as bigint,
            nativePrice
          ),
  };
};

export function useStakeV2SecondaryChainsInfoRequest() {
  const currentChainId = useSelector(selectChainId);

  const otherChains = CHAIN_IDS_WITH_GMX.filter((chainId) => chainId !== currentChainId);

  const multicallQuery = useMulticallMany(otherChains, "useStakeV2SecondaryChainsInfoRequest:multicall", {
    key: [],
    request,
    parseResponse: parseResponse,
  });

  return multicallQuery;
}
