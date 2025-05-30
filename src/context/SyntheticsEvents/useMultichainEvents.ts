import keyBy from "lodash/keyBy";
import pickBy from "lodash/pickBy";
import { useEffect, useMemo, useState } from "react";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import {
  CHAIN_ID_TO_TOKEN_ID_MAP,
  getMappedTokenId,
  isSettlementChain,
  MultichainTokenId,
} from "context/GmxAccountContext/config";
import { useGmxAccountSelectedTransferGuid } from "context/GmxAccountContext/hooks";
import { ENDPOINT_ID_TO_CHAIN_ID } from "context/GmxAccountContext/stargatePools";
import {
  subscribeToComposeDeliveredEvents,
  subscribeToMultichainApprovalEvents,
  subscribeToOftReceivedEvents,
  subscribeToOftSentEvents,
} from "context/WebsocketContext/subscribeToEvents";
import { useWebsocketProvider } from "context/WebsocketContext/WebsocketContextProvider";
import { useChainId } from "lib/chains";
import { EMPTY_OBJECT, EMPTY_SET } from "lib/objects";
import { nowInSeconds } from "sdk/utils/time";

import { CodecUiHelper } from "components/Synthetics/GmxAccountModal/codecs/CodecUiHelper";

import { useSyntheticsEvents } from "./SyntheticsEventsProvider";
import type { ApprovalStatuses, PendingMultichainFunding, SubmittedDeposit } from "./types";

export type MultichainEventsState = {
  multichainSourceChainApprovalStatuses: ApprovalStatuses;
  setMultichainSourceChainApprovalsActiveListener: (name: string) => void;
  removeMultichainSourceChainApprovalsActiveListener: (name: string) => void;

  pendingMultichainFunding: PendingMultichainFunding;
  setMultichainSubmittedDeposit: (submittedDeposit: SubmittedDeposit) => string | undefined;
  multichainFundingPendingIds: Record<
    // Stub id for persistence
    string,
    // Stub id or real guid
    string
  >;
};

const DEFAULT_MULTICHAIN_FUNDING_STATE: PendingMultichainFunding = {
  deposits: {
    submitted: [],
    received: {},
    sent: {},
    executed: {},
  },
};

export function useMultichainEvents({ hasPageLostFocus }: { hasPageLostFocus: boolean }) {
  const [pendingMultichainFunding, setPendingMultichainFunding] = useState<PendingMultichainFunding>(
    DEFAULT_MULTICHAIN_FUNDING_STATE
  );
  const { chainId, srcChainId } = useChainId();

  const { address: currentAccount } = useAccount();

  const { wsProvider, wsSourceChainProvider } = useWebsocketProvider();

  const [, setSelectedTransferGuid] = useGmxAccountSelectedTransferGuid();
  const [multichainFundingPendingIds, setMultichainFundingPendingIds] = useState<Record<string, string>>(EMPTY_OBJECT);

  const pendingReceiveDepositGuids = useMemo(() => {
    return Object.keys(pendingMultichainFunding.deposits.sent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Object.keys(pendingMultichainFunding.deposits.sent).join(",")]);

  const unstablePendingExecuteDepositGuids = Object.keys(pendingMultichainFunding.deposits.received).concat(
    Object.keys(pendingMultichainFunding.deposits.sent)
  );
  const pendingExecuteDepositGuids = useMemo(() => {
    return unstablePendingExecuteDepositGuids;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unstablePendingExecuteDepositGuids.join(",")]);

  useEffect(
    function subscribeOftSentEvents() {
      if (
        srcChainId === undefined ||
        hasPageLostFocus ||
        !currentAccount ||
        !wsSourceChainProvider ||
        !isSettlementChain(chainId)
      ) {
        return;
      }

      const tokenIdMap = CHAIN_ID_TO_TOKEN_ID_MAP[srcChainId];
      const sourceChainStargates = Object.values(tokenIdMap).map((tokenId) => tokenId.stargate);
      const tokenIdByStargate = keyBy(Object.values(tokenIdMap), (tokenId: MultichainTokenId) => tokenId.stargate);

      const unsubscribeFromOftSentEvents = subscribeToOftSentEvents(
        wsSourceChainProvider,
        currentAccount,
        sourceChainStargates,
        (info) => {
          const settlementChainId = ENDPOINT_ID_TO_CHAIN_ID[info.dstEid];

          if (settlementChainId !== chainId) {
            return;
          }

          const stargatePoolAddress = info.sender;
          const tokenId = tokenIdByStargate[stargatePoolAddress];

          const settlementChainTokenId = getMappedTokenId(tokenId.chainId, tokenId.address, chainId);
          const tokenAddress = settlementChainTokenId?.address;

          if (!tokenAddress) {
            throw new Error("No settlement chain token address for OFTSent event");
          }

          setPendingMultichainFunding((prev) => {
            const newPendingMultichainFunding: PendingMultichainFunding = structuredClone(prev);

            const currentSubmittingDepositIndex = newPendingMultichainFunding.deposits.submitted.findIndex(
              (deposit) => deposit.sentTxn === info.txnHash
            );

            if (currentSubmittingDepositIndex === -1) {
              // If there were no submitted order from UI we can not be sure if this sent event is related to GMX without parsing the whole transaction for events
              // If its really necessary we could fetch the tx to get PacketSent withing the same transaction event and parse the contents

              // eslint-disable-next-line no-console
              console.warn("Got OFTSent event but no deposits were submitted from UI");
              return prev;
            }

            const currentSubmittingDeposit =
              newPendingMultichainFunding.deposits.submitted[currentSubmittingDepositIndex];
            newPendingMultichainFunding.deposits.submitted.splice(currentSubmittingDepositIndex, 1);

            setSelectedTransferGuid((prev) => {
              if (!prev || prev !== currentSubmittingDeposit.id) {
                return prev;
              }

              return info.guid;
            });

            setMultichainFundingPendingIds((prev) => {
              if (currentSubmittingDeposit.id in prev) {
                return { ...prev, [currentSubmittingDeposit.id]: info.guid };
              }

              return prev;
            });

            newPendingMultichainFunding.deposits.sent[info.guid] = {
              account: currentAccount,
              sentAmount: info.amountSentLD,
              id: info.guid,
              sentTxn: info.txnHash,
              operation: "deposit",
              step: "sent",
              token: tokenAddress,
              sourceChainId: srcChainId,
              settlementChainId: chainId,
              sentTimestamp: currentSubmittingDeposit.sentTimestamp,

              executedTimestamp: undefined,
              executedTxn: undefined,
              isExecutionError: undefined,
              receivedAmount: undefined,
              receivedTimestamp: undefined,
              receivedTxn: undefined,

              isFromWs: true,
            };

            return newPendingMultichainFunding;
          });
        }
      );

      return function cleanup() {
        unsubscribeFromOftSentEvents();
      };
    },
    [chainId, currentAccount, hasPageLostFocus, setSelectedTransferGuid, srcChainId, wsSourceChainProvider]
  );

  useEffect(
    function subscribeOftReceivedEvents() {
      if (hasPageLostFocus || !wsProvider || !isSettlementChain(chainId) || pendingReceiveDepositGuids.length === 0) {
        return;
      }

      const tokenIdMap = CHAIN_ID_TO_TOKEN_ID_MAP[chainId];
      const settlementChainStargates = Object.values(tokenIdMap).map((tokenId) => tokenId.stargate);

      const unsubscribeFromOftReceivedEvents = subscribeToOftReceivedEvents(
        wsProvider,
        settlementChainStargates,
        pendingReceiveDepositGuids,
        (info) => {
          setPendingMultichainFunding((prev) => {
            const newPendingMultichainFunding = structuredClone(prev);

            const pendingSentDeposit = newPendingMultichainFunding.deposits.sent[info.guid];

            if (!pendingSentDeposit) {
              // eslint-disable-next-line no-console
              console.warn("Got OFTReceive event but no pending deposits were sent from UI");

              return newPendingMultichainFunding;
            }

            delete newPendingMultichainFunding.deposits.sent[info.guid];
            newPendingMultichainFunding.deposits.received[info.guid] = pendingSentDeposit;

            pendingSentDeposit.step = "received";
            pendingSentDeposit.receivedAmount = info.amountReceivedLD;
            pendingSentDeposit.receivedTimestamp = nowInSeconds();
            pendingSentDeposit.receivedTxn = info.txnHash;

            return newPendingMultichainFunding;
          });
        }
      );

      return function cleanup() {
        unsubscribeFromOftReceivedEvents?.();
      };
    },
    [chainId, hasPageLostFocus, pendingReceiveDepositGuids, wsProvider]
  );

  useEffect(
    function subscribeComposeDeliveredEvents() {
      if (hasPageLostFocus || !wsProvider || !isSettlementChain(chainId) || pendingExecuteDepositGuids.length === 0) {
        return;
      }

      const lzEndpoint = CodecUiHelper.getLzEndpoint(chainId);

      const unsubscribeFromComposeDeliveredEvents = subscribeToComposeDeliveredEvents(
        wsProvider,
        lzEndpoint,
        pendingExecuteDepositGuids,
        (info) => {
          setTimeout(() => {
            setMultichainFundingPendingIds((prev) => {
              return pickBy(prev, (value) => value !== info.guid);
            });
          }, 5000);

          setPendingMultichainFunding((prev) => {
            const newPendingMultichainFunding = structuredClone(prev);

            const pendingExecuteDeposit = newPendingMultichainFunding.deposits.received[info.guid];

            if (!pendingExecuteDeposit) {
              // eslint-disable-next-line no-console
              console.warn("Got ComposeDelivered event but no pending deposits were received from UI");
              return newPendingMultichainFunding;
            }

            delete newPendingMultichainFunding.deposits.received[info.guid];
            newPendingMultichainFunding.deposits.executed[info.guid] = pendingExecuteDeposit;

            pendingExecuteDeposit.step = "executed";
            pendingExecuteDeposit.executedTimestamp = nowInSeconds();
            pendingExecuteDeposit.executedTxn = info.txnHash;
            pendingExecuteDeposit.isExecutionError = false;

            return newPendingMultichainFunding;
          });
        }
      );

      return function cleanup() {
        unsubscribeFromComposeDeliveredEvents?.();
      };
    },
    [chainId, hasPageLostFocus, pendingExecuteDepositGuids, wsProvider]
  );

  // Approval statuses

  const [sourceChainApprovalActiveListeners, setSourceChainApprovalActiveListeners] = useState<Set<string>>(EMPTY_SET);
  const [sourceChainApprovalStatuses, setSourceChainApprovalStatuses] = useState<ApprovalStatuses>(EMPTY_OBJECT);

  const shouldListenToMultichainApprovals = sourceChainApprovalActiveListeners.size > 0;
  useEffect(
    function subscribeMultichainApprovals() {
      if (!wsSourceChainProvider || !currentAccount || !srcChainId || !shouldListenToMultichainApprovals) {
        return;
      }

      const tokenIdMap = CHAIN_ID_TO_TOKEN_ID_MAP[srcChainId];
      const tokenAddresses = Object.values(tokenIdMap)
        .filter((tokenId) => tokenId.address !== zeroAddress)
        .map((tokenId) => tokenId.address);
      const stargates = Object.values(tokenIdMap)
        .filter((tokenId) => tokenId.address !== zeroAddress)
        .map((tokenId) => tokenId.stargate);

      const unsubscribeApproval = subscribeToMultichainApprovalEvents(
        wsSourceChainProvider,
        currentAccount,
        tokenAddresses,
        stargates,
        (tokenAddress, spender, value) => {
          setSourceChainApprovalStatuses((old) => ({
            ...old,
            [tokenAddress]: {
              ...old[tokenAddress],
              [spender]: { value, createdAt: Date.now() },
            },
          }));
          // userAnalytics.pushEvent<TokenApproveResultEvent>({
          //   event: "TokenApproveAction",
          //   data: {
          //     action: "ApproveSuccess",
          //   },
          // });
        }
      );

      return function cleanup() {
        unsubscribeApproval();
      };
    },
    [currentAccount, shouldListenToMultichainApprovals, srcChainId, wsSourceChainProvider]
  );

  const multichainEventsState = useMemo(
    (): MultichainEventsState => ({
      pendingMultichainFunding,
      multichainFundingPendingIds,
      setMultichainSubmittedDeposit: (submittedEvent) => {
        if (!currentAccount || srcChainId === undefined) {
          return;
        }

        const stubId = `<stub-${Date.now()}>`;
        setPendingMultichainFunding((prev) => {
          const newPendingMultichainFunding = structuredClone(prev);
          newPendingMultichainFunding.deposits.submitted.push({
            account: currentAccount,
            id: stubId,
            operation: "deposit",
            step: "submitted",
            settlementChainId: chainId,
            sourceChainId: srcChainId,
            token: submittedEvent.tokenAddress,
            sentAmount: submittedEvent.amount,
            sentTxn: submittedEvent.sentTxn,
            sentTimestamp: nowInSeconds(),

            receivedAmount: undefined,
            receivedTxn: undefined,
            receivedTimestamp: undefined,
            isExecutionError: undefined,
            executedTxn: undefined,
            executedTimestamp: undefined,
            isFromWs: true,
          });
          return newPendingMultichainFunding;
        });

        setMultichainFundingPendingIds((prev) => ({ ...prev, [stubId]: stubId }));

        return stubId;
      },
      multichainSourceChainApprovalStatuses: sourceChainApprovalStatuses,
      setMultichainSourceChainApprovalsActiveListener: (name: string) => {
        setSourceChainApprovalActiveListeners((old) => {
          const newSet = new Set(old);
          newSet.add(name);
          return newSet;
        });
      },
      removeMultichainSourceChainApprovalsActiveListener: (name: string) => {
        setSourceChainApprovalActiveListeners((old) => {
          const newSet = new Set(old);
          newSet.delete(name);
          return newSet;
        });
      },
    }),
    [
      pendingMultichainFunding,
      multichainFundingPendingIds,
      sourceChainApprovalStatuses,
      currentAccount,
      srcChainId,
      chainId,
    ]
  );

  return multichainEventsState;
}

export function useMultichainApprovalsActiveListener(name: string) {
  const { setMultichainSourceChainApprovalsActiveListener, removeMultichainSourceChainApprovalsActiveListener } =
    useSyntheticsEvents();

  useEffect(() => {
    setMultichainSourceChainApprovalsActiveListener(name);

    return () => {
      removeMultichainSourceChainApprovalsActiveListener(name);
    };
  }, [name, setMultichainSourceChainApprovalsActiveListener, removeMultichainSourceChainApprovalsActiveListener]);
}
