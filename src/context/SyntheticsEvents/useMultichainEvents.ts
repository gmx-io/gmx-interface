import keyBy from "lodash/keyBy";
import pickBy from "lodash/pickBy";
import { useEffect, useMemo, useState } from "react";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import { getContract } from "config/contracts";
import {
  CHAIN_ID_TO_TOKEN_ID_MAP,
  getMappedTokenId,
  isSettlementChain,
  MultichainTokenId,
} from "context/GmxAccountContext/config";
import { useGmxAccountSelectedTransferGuid } from "context/GmxAccountContext/hooks";
import { ENDPOINT_ID_TO_CHAIN_ID } from "context/GmxAccountContext/stargatePools";
import { MultichainFundingHistoryItem } from "context/GmxAccountContext/types";
import {
  subscribeToComposeDeliveredEvents,
  subscribeToMultichainApprovalEvents,
  subscribeToOftReceivedEvents,
  subscribeToOftSentEvents,
} from "context/WebsocketContext/subscribeToEvents";
import { useWebsocketProvider } from "context/WebsocketContext/WebsocketContextProvider";
import { useChainId } from "lib/chains";
import { EMPTY_OBJECT, EMPTY_SET } from "lib/objects";
import { LRUCache } from "sdk/utils/LruCache";
import { nowInSeconds } from "sdk/utils/time";

import { CodecUiHelper } from "components/Synthetics/GmxAccountModal/codecs/CodecUiHelper";
import { isStepGreater } from "components/Synthetics/GmxAccountModal/useGmxAccountFundingHistory";

import { useSyntheticsEvents } from "./SyntheticsEventsProvider";
import type {
  ApprovalStatuses,
  PendingMultichainFunding,
  SubmittedMultichainDeposit,
  SubmittedMultichainWithdrawal,
} from "./types";

export type MultichainEventsState = {
  multichainSourceChainApprovalStatuses: ApprovalStatuses;
  setMultichainSourceChainApprovalsActiveListener: (name: string) => void;
  removeMultichainSourceChainApprovalsActiveListener: (name: string) => void;

  pendingMultichainFunding: PendingMultichainFunding;
  setMultichainSubmittedDeposit: (submittedDeposit: SubmittedMultichainDeposit) => string | undefined;
  setMultichainSubmittedWithdrawal: (submittedWithdrawal: SubmittedMultichainWithdrawal) => string | undefined;
  setMultichainWithdrawalSentTxnHash: (mockId: string, txnHash: string) => void;
  setMultichainWithdrawalSentError: (mockId: string) => void;
  updateMultichainFunding: (items: MultichainFundingHistoryItem[]) => void;

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
    sent: {},
    received: {},
    executed: {},
  },
  withdrawals: {
    submitted: {},
    sent: {},
    received: {},
  },
};

const UNCERTAIN_WITHDRAWALS_CACHE = new LRUCache<string>(1000);

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

  const pendingReceiveWithdrawalGuids = useMemo(() => {
    return Object.keys(pendingMultichainFunding.withdrawals.sent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Object.keys(pendingMultichainFunding.withdrawals.sent).join(",")]);

  useEffect(
    function subscribeSourceChainOftSentEvents() {
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

  //#region Withdrawals

  useEffect(
    function subscribeSettlementChainOftSentEvents() {
      if (
        hasPageLostFocus ||
        !currentAccount ||
        !wsProvider ||
        !isSettlementChain(chainId) ||
        srcChainId === undefined
      ) {
        return;
      }

      const tokenIdMap = CHAIN_ID_TO_TOKEN_ID_MAP[chainId];
      const settlementChainStargates = Object.values(tokenIdMap).map((tokenId) => tokenId.stargate);
      const tokenIdByStargate = keyBy(Object.values(tokenIdMap), (tokenId: MultichainTokenId) => tokenId.stargate);

      const unsubscribeFromOftSentEvents = subscribeToOftSentEvents(
        wsProvider,
        getContract(chainId, "LayerZeroProvider"),
        settlementChainStargates,
        (info) => {
          const sourceChainId = ENDPOINT_ID_TO_CHAIN_ID[info.dstEid];

          if (sourceChainId !== srcChainId) {
            return;
          }

          const stargatePoolAddress = info.sender;
          const tokenId = tokenIdByStargate[stargatePoolAddress];

          const tokenAddress = tokenId.address;

          setPendingMultichainFunding((prev) => {
            const newPendingMultichainFunding: PendingMultichainFunding = structuredClone(prev);

            const currentSubmittingWithdrawal = Object.values(newPendingMultichainFunding.withdrawals.submitted).find(
              (withdrawal) => withdrawal.sentTxn === info.txnHash
            );

            if (currentSubmittingWithdrawal === undefined) {
              // If there were no submitted order from UI we can not be sure if this sent event is related to GMX without parsing the whole transaction for events
              // If its really necessary we could fetch the tx to get PacketSent withing the same transaction event and parse the contents

              // eslint-disable-next-line no-console
              console.warn("Got OFTSent event but no withdrawals were submitted from UI");
              UNCERTAIN_WITHDRAWALS_CACHE.set(info.txnHash, info.guid);
              return prev;
            }

            delete newPendingMultichainFunding.withdrawals.submitted[currentSubmittingWithdrawal.id];

            setSelectedTransferGuid((prev) => {
              if (!prev || prev !== currentSubmittingWithdrawal.id) {
                return prev;
              }

              return info.guid;
            });

            setMultichainFundingPendingIds((prev) => {
              if (currentSubmittingWithdrawal.id in prev) {
                return { ...prev, [currentSubmittingWithdrawal.id]: info.guid };
              }

              return prev;
            });

            newPendingMultichainFunding.withdrawals.sent[info.guid] = {
              account: currentAccount,
              sentAmount: info.amountSentLD,
              id: info.guid,
              sentTxn: info.txnHash,
              operation: "withdrawal",
              step: "sent",
              token: tokenAddress,
              sourceChainId: sourceChainId,
              settlementChainId: chainId,
              sentTimestamp: currentSubmittingWithdrawal.sentTimestamp,

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
    [chainId, currentAccount, hasPageLostFocus, setSelectedTransferGuid, srcChainId, wsProvider]
  );

  useEffect(
    function subscribeSourceChainOftReceivedEvents() {
      if (
        hasPageLostFocus ||
        !wsSourceChainProvider ||
        !isSettlementChain(chainId) ||
        srcChainId === undefined ||
        pendingReceiveWithdrawalGuids.length === 0
      ) {
        return;
      }

      const tokenIdMap = CHAIN_ID_TO_TOKEN_ID_MAP[srcChainId];
      const sourceChainStargates = Object.values(tokenIdMap).map((tokenId) => tokenId.stargate);

      const unsubscribeFromOftReceivedEvents = subscribeToOftReceivedEvents(
        wsSourceChainProvider,
        sourceChainStargates,
        pendingReceiveWithdrawalGuids,
        (info) => {
          setTimeout(() => {
            setMultichainFundingPendingIds((prev) => {
              return pickBy(prev, (value) => value !== info.guid);
            });
          }, 5000);

          setPendingMultichainFunding((prev) => {
            const newPendingMultichainFunding = structuredClone(prev);

            const pendingSentWithdrawal = newPendingMultichainFunding.withdrawals.sent[info.guid];

            if (!pendingSentWithdrawal) {
              // eslint-disable-next-line no-console
              console.warn("Got OFTReceive event but no pending withdrawals were sent from UI");

              return newPendingMultichainFunding;
            }

            delete newPendingMultichainFunding.withdrawals.sent[info.guid];
            newPendingMultichainFunding.withdrawals.received[info.guid] = pendingSentWithdrawal;

            pendingSentWithdrawal.step = "received";
            pendingSentWithdrawal.receivedAmount = info.amountReceivedLD;
            pendingSentWithdrawal.receivedTimestamp = nowInSeconds();
            pendingSentWithdrawal.receivedTxn = info.txnHash;

            return newPendingMultichainFunding;
          });
        }
      );

      return function cleanup() {
        unsubscribeFromOftReceivedEvents?.();
      };
    },
    [chainId, hasPageLostFocus, pendingReceiveWithdrawalGuids, srcChainId, wsSourceChainProvider]
  );

  //#endregion Withdrawals

  //#region Approval statuses

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
      setMultichainSubmittedWithdrawal: (submittedEvent) => {
        if (!currentAccount || srcChainId === undefined) {
          return;
        }

        const stubId = `<stub-${Date.now()}>`;
        setPendingMultichainFunding((prev) => {
          const newPendingMultichainFunding = structuredClone(prev);
          newPendingMultichainFunding.withdrawals.submitted[stubId] = {
            account: currentAccount,
            id: stubId,
            operation: "withdrawal",
            step: "submitted",
            settlementChainId: chainId,
            sourceChainId: srcChainId,
            token: submittedEvent.tokenAddress,
            sentAmount: submittedEvent.amount,
            sentTimestamp: nowInSeconds(),

            sentTxn: undefined,
            receivedAmount: undefined,
            receivedTxn: undefined,
            receivedTimestamp: undefined,
            isExecutionError: undefined,
            executedTxn: undefined,
            executedTimestamp: undefined,

            isFromWs: true,
          };
          return newPendingMultichainFunding;
        });

        setMultichainFundingPendingIds((prev) => ({ ...prev, [stubId]: stubId }));

        return stubId;
      },
      setMultichainWithdrawalSentTxnHash: (mockId, txnHash) => {
        setPendingMultichainFunding((prev) => {
          const newPendingMultichainFunding = structuredClone(prev);
          if (mockId in newPendingMultichainFunding.withdrawals.submitted) {
            const submittedWithdrawal = newPendingMultichainFunding.withdrawals.submitted[mockId];
            submittedWithdrawal.sentTxn = txnHash;
            submittedWithdrawal.sentTimestamp = nowInSeconds();

            if (UNCERTAIN_WITHDRAWALS_CACHE.has(txnHash)) {
              const guid = UNCERTAIN_WITHDRAWALS_CACHE.get(txnHash)!;
              delete newPendingMultichainFunding.withdrawals.submitted[mockId];
              newPendingMultichainFunding.withdrawals.sent[guid] = submittedWithdrawal;
              submittedWithdrawal.step = "sent";
              submittedWithdrawal.id = guid;

              setSelectedTransferGuid((prev) => {
                if (!prev || prev !== mockId) {
                  return prev;
                }

                return guid;
              });

              setMultichainFundingPendingIds((prev) => {
                if (mockId in prev) {
                  return { ...prev, [mockId]: guid };
                }

                return prev;
              });

              UNCERTAIN_WITHDRAWALS_CACHE.delete(txnHash);
            }
          }
          return newPendingMultichainFunding;
        });
      },
      setMultichainWithdrawalSentError: (mockId) => {
        setPendingMultichainFunding((prev) => {
          const newPendingMultichainFunding = structuredClone(prev);
          delete newPendingMultichainFunding.withdrawals.submitted[mockId];
          return newPendingMultichainFunding;
        });

        setMultichainFundingPendingIds((prev) => {
          const newPendingIds = { ...prev };
          delete newPendingIds[mockId];
          return newPendingIds;
        });

        setSelectedTransferGuid((prev) => {
          if (!prev || prev !== mockId) {
            return prev;
          }

          return undefined;
        });
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
      updateMultichainFunding: (items) => {
        const pendingGuids = new Set<string>();

        // pendingMultichainFunding.deposits.
        for (const step of ["received", "sent"] as const) {
          for (const pendingGuid in pendingMultichainFunding.deposits[step]) {
            pendingGuids.add(pendingGuid);
          }
        }

        for (const step of ["sent"] as const) {
          for (const pendingGuid in pendingMultichainFunding.withdrawals[step]) {
            pendingGuids.add(pendingGuid);
          }
        }

        // const freshItems = items.filter((item) => pendingGuids.has(item.id));

        const freshItems: Record<string, MultichainFundingHistoryItem> = {};
        let hasFreshItems = false;

        for (const item of items) {
          if (pendingGuids.has(item.id)) {
            freshItems[item.id] = item;
            hasFreshItems = true;
          }
        }

        if (hasFreshItems) {
          setPendingMultichainFunding((prev) => {
            const newPendingMultichainFunding = structuredClone(prev);

            // if the items that came in ITEMS are in lower statuses in here pendingMultichainFunding, move them to the higher statuses

            const executedGuids: string[] = [];

            for (const step of ["received", "sent"] as const) {
              for (const pendingGuid in newPendingMultichainFunding.deposits[step]) {
                const freshItem = freshItems[pendingGuid];

                if (isStepGreater(freshItem.step, step)) {
                  delete newPendingMultichainFunding.deposits[step][pendingGuid];
                  newPendingMultichainFunding.deposits[freshItem.step][pendingGuid] = freshItem;

                  if (freshItem.step === "executed") {
                    executedGuids.push(pendingGuid);
                  }
                }
              }
            }

            for (const step of ["sent"] as const) {
              for (const pendingGuid in newPendingMultichainFunding.withdrawals[step]) {
                const freshItem = freshItems[pendingGuid];

                if (isStepGreater(freshItem.step, step)) {
                  delete newPendingMultichainFunding.withdrawals[step][pendingGuid];
                  newPendingMultichainFunding.withdrawals[freshItem.step][pendingGuid] = freshItem;
                  if (freshItem.step === "received") {
                    executedGuids.push(pendingGuid);
                  }
                }
              }
            }

            setTimeout(() => {
              setMultichainFundingPendingIds((prev) => {
                return pickBy(prev, (value) => !executedGuids.includes(value));
              });
            }, 5000);

            return newPendingMultichainFunding;
          });
        }
      },
    }),
    [
      pendingMultichainFunding,
      multichainFundingPendingIds,
      sourceChainApprovalStatuses,
      currentAccount,
      srcChainId,
      chainId,
      setSelectedTransferGuid,
    ]
  );

  //#endregion Approval statuses

  useEffect(
    function resetOnAccountChange() {
      setPendingMultichainFunding(DEFAULT_MULTICHAIN_FUNDING_STATE);
      setMultichainFundingPendingIds(EMPTY_OBJECT);
      setSourceChainApprovalStatuses(EMPTY_OBJECT);
    },
    [currentAccount]
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
