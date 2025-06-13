import { zeroAddress } from "viem";

import { getContract } from "config/contracts";
import { MulticallRequestConfig } from "lib/multicall/types";
import { useMulticall } from "lib/multicall/useMulticall";
import { FREQUENT_MULTICALL_REFRESH_INTERVAL } from "lib/timeConstants";
import type { ContractsChainId } from "sdk/configs/chains";
import { getWhitelistedV1Tokens } from "sdk/configs/tokens";

function buildDashboardRequest(chainId: ContractsChainId) {
  const gmxAddress = getContract(chainId, "GMX");
  const glpAddress = getContract(chainId, "GLP");
  const usdgAddress = getContract(chainId, "USDG");
  const readerAddress = getContract(chainId, "Reader");
  const vaultAddress = getContract(chainId, "Vault");
  const glpManagerAddress = getContract(chainId, "GlpManager");

  const tokensForSupplyQuery = [gmxAddress, glpAddress, usdgAddress];

  const whitelistedTokensAddresses = getWhitelistedV1Tokens(chainId).map((token) => token.address);

  return {
    glp: {
      contractAddress: glpManagerAddress,
      abiId: "GlpManager",
      calls: {
        getAums:
          glpManagerAddress === zeroAddress
            ? undefined
            : {
                methodName: "getAums",
                params: [],
              },
      },
    },
    reader: {
      contractAddress: readerAddress,
      abiId: "ReaderV2",
      calls: {
        getTokenBalancesWithSupplies:
          readerAddress === zeroAddress
            ? undefined
            : {
                methodName: "getTokenBalancesWithSupplies",
                params: [zeroAddress, tokensForSupplyQuery],
              },
        getFees:
          readerAddress === zeroAddress || vaultAddress === zeroAddress
            ? undefined
            : {
                methodName: "getFees",
                params: [vaultAddress, whitelistedTokensAddresses],
              },
      },
    },
    vault: {
      contractAddress: vaultAddress,
      abiId: "VaultV2",
      calls: {
        totalTokenWeights:
          vaultAddress === zeroAddress
            ? undefined
            : {
                methodName: "totalTokenWeights",
                params: [],
              },
      },
    },
  } satisfies MulticallRequestConfig<any>;
}

function parseDashboardResponse(result) {
  const minAum = result.data.glp.getAums.returnValues[0];
  const maxAum = result.data.glp.getAums.returnValues[1];
  const aum = (minAum + maxAum) / 2n;

  return {
    glp: {
      aum,
    },
    reader: {
      tokenBalancesWithSupplies: {
        gmxSypply: result.data.reader.getTokenBalancesWithSupplies.returnValues[1] as bigint,
        glpSupply: result.data.reader.getTokenBalancesWithSupplies.returnValues[3] as bigint,
        usdgSupply: result.data.reader.getTokenBalancesWithSupplies.returnValues[5] as bigint,
      },
      fees: result.data.reader.getFees.returnValues as bigint[],
    },
    vault: {
      totalTokenWeights: result.data.vault.totalTokenWeights.returnValues[0] as bigint,
    },
  };
}

export type ChainStats = ReturnType<typeof parseDashboardResponse>;

export function useDashboardChainStatsMulticall(chainId: ContractsChainId) {
  const { data } = useMulticall(chainId, `useDashboardChainStatsMulticall`, {
    key: [chainId],
    refreshInterval: FREQUENT_MULTICALL_REFRESH_INTERVAL,
    request: buildDashboardRequest,
    parseResponse: parseDashboardResponse,
  });

  return data;
}
