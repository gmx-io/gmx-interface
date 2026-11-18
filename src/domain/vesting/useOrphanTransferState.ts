import { useMemo } from "react";
import { zeroAddress } from "viem";

import { getContract } from "config/contracts";
import { useMulticall } from "lib/multicall";
import type { MulticallRequestConfig, MulticallResult } from "lib/multicall";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import type { ContractsChainId } from "sdk/configs/chains";
import { incentiveVesterTransferFeatureDisabledKey } from "sdk/configs/dataStore";

import { getOrphanTransferState } from "./vestingVaults";

type OrphanTransferReads = Parameters<typeof getOrphanTransferState>[0];
type OrphanTransferSenderData = Omit<OrphanTransferReads, "isReceiverFresh" | "isReceiverFrozen">;
type OrphanTransferReceiverData = Pick<OrphanTransferReads, "isReceiverFresh" | "isReceiverFrozen">;

export function useOrphanTransferState({
  chainId,
  sender,
  receiver,
}: {
  chainId: ContractsChainId;
  sender: string | undefined;
  receiver: string | undefined;
}) {
  const rewardRouterAddress = getContract(chainId, "RewardRouterV3");
  const orphanVesterAddress = getContract(chainId, "OrphanRatioVester");
  const hasContracts = rewardRouterAddress !== zeroAddress && orphanVesterAddress !== zeroAddress;
  const senderAddress = sender ?? zeroAddress;

  // the router-wide reads ride with the sender, so typing a receiver doesn't reload the paused notice
  const { data: senderData } = useMulticall<MulticallRequestConfig<any>, OrphanTransferSenderData>(
    chainId,
    "useOrphanTransferState:sender",
    {
      key: hasContracts ? [senderAddress] : null,
      refreshInterval: CONFIG_UPDATE_INTERVAL,
      request: (requestChainId) => ({
        rewardRouter: {
          contractAddress: getContract(requestChainId, "RewardRouterV3"),
          abiId: "RewardRouterV3",
          calls: {
            designatedVestersLength: { methodName: "designatedVestersLength", params: [] },
            isOrphanDesignated: { methodName: "isDesignatedVester", params: [orphanVesterAddress] },
          },
        },
        dataStore: {
          contractAddress: getContract(requestChainId, "DataStore"),
          abiId: "DataStore",
          calls: {
            isTransferDisabled: {
              methodName: "getBool",
              params: [incentiveVesterTransferFeatureDisabledKey(orphanVesterAddress)],
            },
          },
        },
        orphanVester: {
          contractAddress: orphanVesterAddress,
          abiId: "RatioVester",
          calls: {
            isProvisioningComplete: { methodName: "provisioningComplete", params: [] },
            hasSenderOpenSession: { methodName: "hasOpenSession", params: [senderAddress] },
            isSenderFrozen: { methodName: "isFrozen", params: [senderAddress] },
          },
        },
      }),
      parseResponse: parseSenderResponse,
    }
  );

  const { data: receiverData } = useMulticall<MulticallRequestConfig<any>, OrphanTransferReceiverData>(
    chainId,
    "useOrphanTransferState:receiver",
    {
      key: hasContracts && receiver !== undefined ? [receiver] : null,
      refreshInterval: CONFIG_UPDATE_INTERVAL,
      request: {
        orphanVester: {
          contractAddress: orphanVesterAddress,
          abiId: "RatioVester",
          calls: {
            isReceiverFresh: { methodName: "isFreshForTransfer", params: [receiver] },
            isReceiverFrozen: { methodName: "isFrozen", params: [receiver] },
          },
        },
      },
      parseResponse: (result) => ({
        isReceiverFresh: result.data.orphanVester.isReceiverFresh.returnValues[0],
        isReceiverFrozen: result.data.orphanVester.isReceiverFrozen.returnValues[0],
      }),
    }
  );

  return useMemo(
    () =>
      senderData === undefined
        ? undefined
        : getOrphanTransferState({
            ...senderData,
            isReceiverFresh: receiverData?.isReceiverFresh,
            isReceiverFrozen: receiverData?.isReceiverFrozen,
          }),
    [senderData, receiverData]
  );
}

function parseSenderResponse(result: MulticallResult<MulticallRequestConfig<any>>): OrphanTransferSenderData {
  const { rewardRouter, dataStore, orphanVester } = result.data;

  return {
    designatedVestersLength: rewardRouter.designatedVestersLength.returnValues[0],
    isOrphanDesignated: rewardRouter.isOrphanDesignated.returnValues[0],
    isTransferDisabled: dataStore.isTransferDisabled.returnValues[0],
    isProvisioningComplete: orphanVester.isProvisioningComplete.returnValues[0],
    hasSenderOpenSession: orphanVester.hasSenderOpenSession.returnValues[0],
    isSenderFrozen: orphanVester.isSenderFrozen.returnValues[0],
  };
}
