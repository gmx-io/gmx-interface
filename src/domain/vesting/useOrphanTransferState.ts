import { zeroAddress } from "viem";

import { getContract } from "config/contracts";
import { useMulticall } from "lib/multicall";
import type { MulticallRequestConfig, MulticallResult } from "lib/multicall";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import type { ContractsChainId } from "sdk/configs/chains";
import { incentiveVesterTransferFeatureDisabledKey } from "sdk/configs/dataStore";

export type OrphanTransferState = {
  isTransferPaused: boolean;
  // the router checks the Legacy vault on transfers only while it is designated
  isOrphanDesignated: boolean;
  hasSenderOpenSession: boolean;
  isReceiverFresh: boolean;
};

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
  const senderAddress = sender ?? zeroAddress;
  const receiverAddress = receiver ?? zeroAddress;

  const { data } = useMulticall<MulticallRequestConfig<any>, OrphanTransferState>(chainId, "useOrphanTransferState", {
    key:
      rewardRouterAddress !== zeroAddress && orphanVesterAddress !== zeroAddress
        ? [senderAddress, receiverAddress]
        : null,
    refreshInterval: CONFIG_UPDATE_INTERVAL,
    request: {
      rewardRouter: {
        contractAddress: rewardRouterAddress,
        abiId: "RewardRouterV3",
        calls: {
          designatedVestersLength: { methodName: "designatedVestersLength", params: [] },
          isOrphanDesignated: { methodName: "isDesignatedVester", params: [orphanVesterAddress] },
        },
      },
      dataStore: {
        contractAddress: getContract(chainId, "DataStore"),
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
          provisioningComplete: { methodName: "provisioningComplete", params: [] },
          hasSenderOpenSession: { methodName: "hasOpenSession", params: [senderAddress] },
          isReceiverFresh: { methodName: "isFreshForTransfer", params: [receiverAddress] },
        },
      },
    },
    parseResponse: parseOrphanTransferResponse,
  });

  return data;
}

function parseOrphanTransferResponse(result: MulticallResult<MulticallRequestConfig<any>>): OrphanTransferState {
  const { rewardRouter, dataStore, orphanVester } = result.data;
  const isOrphanDesignated: boolean = rewardRouter.isOrphanDesignated.returnValues[0];
  // RatioVester.validateTransfersOpen reverts on either
  const isOrphanTransferClosed =
    dataStore.isTransferDisabled.returnValues[0] || !orphanVester.provisioningComplete.returnValues[0];

  return {
    isTransferPaused:
      rewardRouter.designatedVestersLength.returnValues[0] === 0n || (isOrphanDesignated && isOrphanTransferClosed),
    isOrphanDesignated,
    hasSenderOpenSession: isOrphanDesignated && orphanVester.hasSenderOpenSession.returnValues[0],
    isReceiverFresh: !isOrphanDesignated || orphanVester.isReceiverFresh.returnValues[0],
  };
}
