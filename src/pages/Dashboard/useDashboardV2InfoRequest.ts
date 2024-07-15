import { zeroAddress } from "viem";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { getContract } from "config/contracts";
import { getTokenBySymbol, getWhitelistedV1Tokens } from "config/tokens";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useMulticall } from "lib/multicall";
import { expandDecimals } from "lib/numbers";

import GlpManager from "abis/GlpManager.json";
import ReaderV2 from "abis/ReaderV2.json";
import UniPool from "abis/UniPool.json";
import UniswapV2 from "abis/UniswapV2.json";
import Vault from "abis/Vault.json";
import VaultReader from "abis/VaultReader.json";
import Token from "abis/Token.json";
import { getGmxPriceFromArbtitrum, getGmxPriceFromAvalanche } from "domain/legacy";

export function useDashboardV2InfoRequest() {
  const chainId = useSelector(selectChainId);

  const readerAddress = getContract(chainId, "Reader");
  const vaultAddress = getContract(chainId, "Vault");
  const glpManagerAddress = getContract(chainId, "GlpManager");
  const vaultReaderAddress = getContract(chainId, "VaultReader");
  const positionRouterAddress = getContract(chainId, "PositionRouter");

  const gmxAddress = getContract(chainId, "GMX");
  const glpAddress = getContract(chainId, "GLP");
  const usdgAddress = getContract(chainId, "USDG");
  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");

  const tokensForSupplyQuery = [gmxAddress, glpAddress, usdgAddress];

  const whitelistedTokens = getWhitelistedV1Tokens(chainId);
  const whitelistedTokenAddresses = whitelistedTokens.map((token) => token.address);

  const data = useMulticall(chainId, "useDashboardV2InfoRequest", {
    key: [],
    request: {
      aums: {
        abi: GlpManager.abi,
        contractAddress: glpManagerAddress,
        calls: {
          aums: {
            methodName: "getAums",
            params: [],
          },
        },
      },
      readerV2: {
        abi: ReaderV2.abi,
        contractAddress: readerAddress,
        calls: {
          tokenBalancesWithSupplies: {
            methodName: "getTokenBalancesWithSupplies",
            params: [zeroAddress, tokensForSupplyQuery],
          },

          fees: {
            methodName: "getFees",
            params: [vaultAddress, whitelistedTokenAddresses],
          },
        },
      },
      vault: {
        abi: Vault.abi,
        contractAddress: vaultAddress,
        calls: {
          totalTokenWeights: {
            methodName: "totalTokenWeights",
            params: [],
          },
          minPrice: {
            methodName: "getMinPrice",
            params: [getTokenBySymbol(chainId, chainId === ARBITRUM ? "WETH" : "WAVAX").address],
          },
        },
      },
      vaultTokenInfo: {
        abi: VaultReader.abi,
        contractAddress: vaultReaderAddress,
        calls: {
          getVaultTokenInfoV4: {
            methodName: "getVaultTokenInfoV4",
            params: [
              vaultAddress,
              positionRouterAddress,
              nativeTokenAddress,
              expandDecimals(1, 18),
              whitelistedTokenAddresses,
            ],
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
      gmxBalances: {
        abi: Token.abi,
        contractAddress: gmxAddress,
        calls: {
          dex: {
            methodName: "balanceOf",
            params: [getContract(chainId, chainId === ARBITRUM ? "UniswapGmxEthPool" : "TraderJoeGmxAvaxPool")],
          },
          staked: {
            methodName: "balanceOf",
            params: [getContract(chainId, "StakedGmxTracker")],
          },
        },
      },
    },
    parseResponse: (result) => {
      const nativePrice = result.data.vault.minPrice.returnValues[0] as bigint;
      return {
        aums: result.data.aums.aums.returnValues as bigint[],
        totalSupplies: result.data.readerV2.tokenBalancesWithSupplies.returnValues as bigint[],
        fees: result.data.readerV2.fees.returnValues as bigint[],
        totalTokenWeights: result.data.vault.totalTokenWeights.returnValues[0] as bigint,
        vaultTokenInfo: result.data.vaultTokenInfo.getVaultTokenInfoV4.returnValues as bigint[],
        nativePrice,
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
        gmxLiquidity: result.data.gmxBalances.dex.returnValues[0] as bigint,
        gmxStaked: result.data.gmxBalances.staked.returnValues[0] as bigint,
      };
    },
    refreshInterval: null,
  });

  return data;
}
