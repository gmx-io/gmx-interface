import { zeroAddress } from "viem";

import { getContract } from "config/contracts";
import { useMulticall } from "lib/multicall";
import type { MulticallRequestConfig, MulticallResult } from "lib/multicall";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import type { ContractsChainId } from "sdk/configs/chains";
import {
  incentiveVesterClaimFeatureDisabledKey,
  incentiveVesterDepositFeatureDisabledKey,
} from "sdk/configs/dataStore";

import { getWalletPairAmounts, type OrphanVaultData, parseOrphanVestingInfo } from "./vestingVaults";

export function useOrphanVestingData(chainId: ContractsChainId, account: string | undefined) {
  const orphanVesterAddress = getContract(chainId, "OrphanRatioVester");

  const { data, mutate } = useMulticall<MulticallRequestConfig<any>, OrphanVaultData>(chainId, "useOrphanVestingData", {
    key: orphanVesterAddress !== zeroAddress && account ? [account] : null,
    refreshInterval: CONFIG_UPDATE_INTERVAL,
    request: (requestChainId) => ({
      reader: {
        contractAddress: getContract(requestChainId, "RatioVesterReader"),
        abiId: "RatioVesterReader",
        calls: {
          vestingInfo: { methodName: "getVestingInfo", params: [[orphanVesterAddress], account] },
          tranches: { methodName: "getTranches", params: [orphanVesterAddress, account] },
        },
      },
      rewardRouter: {
        contractAddress: getContract(requestChainId, "RewardRouterV3"),
        abiId: "RewardRouterV3",
        calls: { isOpen: { methodName: "isDesignatedVester", params: [orphanVesterAddress] } },
      },
      dataStore: {
        contractAddress: getContract(requestChainId, "DataStore"),
        abiId: "DataStore",
        calls: {
          isDepositPaused: {
            methodName: "getBool",
            params: [incentiveVesterDepositFeatureDisabledKey(orphanVesterAddress)],
          },
          isClaimPaused: {
            methodName: "getBool",
            params: [incentiveVesterClaimFeatureDisabledKey(orphanVesterAddress)],
          },
        },
      },
      feeGmxTracker: {
        contractAddress: getContract(requestChainId, "FeeGmxTracker"),
        abiId: "RewardTracker",
        calls: {
          walletAmount: { methodName: "balanceOf", params: [account] },
          stakedAmount: { methodName: "stakedAmounts", params: [account] },
        },
      },
      gmxVester: {
        contractAddress: getContract(requestChainId, "GmxVester"),
        abiId: "Vester",
        calls: { pairAmount: { methodName: "pairAmounts", params: [account] } },
      },
    }),
    parseResponse: parseOrphanVaultResponse,
  });

  return { orphanVaultData: data, mutateOrphanVaultData: mutate };
}

function parseOrphanVaultResponse(result: MulticallResult<MulticallRequestConfig<any>>): OrphanVaultData {
  const { reader, rewardRouter, dataStore, feeGmxTracker, gmxVester } = result.data;

  const vesting = parseOrphanVestingInfo({
    vestingInfo: reader.vestingInfo.returnValues as bigint[],
    trancheStartTimes: reader.tranches.returnValues[0] as bigint[],
  });

  return {
    ...vesting,
    isOpen: rewardRouter.isOpen.returnValues[0],
    isDepositPaused: dataStore.isDepositPaused.returnValues[0],
    isClaimPaused: dataStore.isClaimPaused.returnValues[0],
    ...getWalletPairAmounts({
      walletPairAmount: feeGmxTracker.walletAmount.returnValues[0],
      stakedPairAmount: feeGmxTracker.stakedAmount.returnValues[0],
      gmxVaultPairAmount: gmxVester.pairAmount.returnValues[0],
      orphanPairAmount: vesting.reservedAmount,
    }),
  };
}
