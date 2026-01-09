import keyBy from "lodash/keyBy";
import pickBy from "lodash/pickBy";
import uniqBy from "lodash/uniqBy";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import { getChainName, SourceChainId } from "config/chains";
import { getContract } from "config/contracts";
import {
  CHAIN_ID_TO_TOKEN_ID_MAP,
  ENDPOINT_ID_TO_CHAIN_ID,
  getMappedTokenId,
  isSettlementChain,
  MultichainTokenId,
} from "config/multichain";
import { useGmxAccountSelectedTransferGuid } from "context/GmxAccountContext/hooks";
import {
  OftSentInfo,
  subscribeToComposeDeliveredEvents,
  subscribeToMultichainApprovalEvents,
  subscribeToOftReceivedEvents,
  subscribeToOftSentEvents,
} from "context/WebsocketContext/subscribeToEvents";
import { useWebsocketProvider, useWsAdditionalSourceChains } from "context/WebsocketContext/WebsocketContextProvider";
import { CodecUiHelper } from "domain/multichain/codecs/CodecUiHelper";
import { MultichainFundingHistoryItem } from "domain/multichain/types";
import { isStepGreater } from "domain/multichain/useGmxAccountFundingHistory";
import { useChainId } from "lib/chains";
import {
  getMultichainDepositMetricId,
  getMultichainWithdrawalMetricId,
  metrics,
  MultichainDepositMetricData,
  MultichainWithdrawalMetricData,
  sendOrderExecutedMetric,
} from "lib/metrics";
import { EMPTY_ARRAY, EMPTY_OBJECT } from "lib/objects";
import { sendMultichainDepositSuccessEvent, sendMultichainWithdrawalSuccessEvent } from "lib/userAnalytics/utils";
import { getToken } from "sdk/configs/tokens";
import { adjustForDecimals } from "sdk/utils/numbers";
import { nowInSeconds } from "sdk/utils/time";

import { useSyntheticsEvents } from "./SyntheticsEventsProvider";
import type {
  ApprovalStatuses,
  PendingMultichainFunding,
  SubmittedMultichainDeposit,
  SubmittedMultichainWithdrawal,
} from "./types";

export type MultichainEventsState = {
  multichainSourceChainApprovalStatuses: ApprovalStatuses;
  setMultichainSourceChainApprovalsActiveListener: (chainId: SourceChainId, name: string) => void;
  removeMultichainSourceChainApprovalsActiveListener: (chainId: SourceChainId, name: string) => void;

  pendingMultichainFunding: PendingMultichainFunding;
  setMultichainSubmittedDeposit: (submittedDeposit: SubmittedMultichainDeposit) => string | undefined;
  setMultichainSubmittedWithdrawal: (submittedWithdrawal: SubmittedMultichainWithdrawal) => string | undefined;
  setMultichainWithdrawalSentTxnHash: (mockId: string, txnHash: string) => void;
  setMultichainWithdrawalSentError: (mockId: string) => void;
  updatePendingMultichainFunding: (items: MultichainFundingHistoryItem[]) => void;

  multichainFundingPendingIds: Record<
    // Stub id for persistence
    string,
    // Stub id or real guid
    string
  >;

  removeMultichainFundingPendingIds: (id: string | string[]) => void;
};

const DEFAULT_MULTICHAIN_FUNDING_STATE: PendingMultichainFunding = [];

const FINISHED_FUNDING_ITEM_CLEARING_DELAY_MS = 5000;
const SUBSCRIPTION_MAX_TTL_MS = 5 * 60 * 1000;
const SOURCE_CHAIN_APPROVAL_LISTENER_CLEANUP_DELAY_MS = 1 * 60 * 1000;
const DEBUG_MULTICHAIN_EVENTS_LOGGING = false;
const WS_EVENT_CACHE_TIMEOUT_MS = 20_000;

const debugLog = (...args: any[]) => {
  if (DEBUG_MULTICHAIN_EVENTS_LOGGING) {
    // eslint-disable-next-line no-console
    console.log("[multichain]", ...args);
  }
};

export function useMultichainEvents({ hasPageLostFocus }: { hasPageLostFocus: boolean }) {
  const [pendingMultichainFunding, setPendingMultichainFunding] = useState<PendingMultichainFunding>(
    DEFAULT_MULTICHAIN_FUNDING_STATE
  );
  const { chainId, srcChainId } = useChainId();

  const { address: currentAccount } = useAccount();

  const { wsProvider, wsSourceChainProviders } = useWebsocketProvider();
  const wsSourceChainProvider = srcChainId ? wsSourceChainProviders[srcChainId] : undefined;

  const [, setSelectedTransferGuid] = useGmxAccountSelectedTransferGuid();
  const [multichainFundingPendingIds, setMultichainFundingPendingIds] = useState<Record<string, string>>(EMPTY_OBJECT);

  const scheduleMultichainFundingItemClearing = useCallback(
    (executedGuids: string[]) => {
      setTimeout(() => {
        setMultichainFundingPendingIds((prev) => {
          return pickBy(prev, (value) => !executedGuids.includes(value));
        });
      }, FINISHED_FUNDING_ITEM_CLEARING_DELAY_MS);
    },
    [setMultichainFundingPendingIds]
  );

  const pendingReceiveDepositGuidsRef = useRef<string[]>([]);
  const pendingExecuteDepositGuidsRef = useRef<string[]>([]);
  const pendingReceiveWithdrawalGuidsRef = useRef<string[]>([]);

  const pendingReceiveDepositGuidsKey = useMemo(() => {
    const guids = pendingMultichainFunding
      .filter((item) => item.operation === "deposit" && item.step === "sent")
      .map((item) => item.id);
    pendingReceiveDepositGuidsRef.current = guids;
    return guids.join(",");
  }, [pendingMultichainFunding]);

  const pendingExecuteDepositGuidsKey = useMemo(() => {
    const allGuids = pendingMultichainFunding
      .filter((item) => item.operation === "deposit" && (item.step === "sent" || item.step === "received"))
      .map((item) => item.id);
    pendingExecuteDepositGuidsRef.current = allGuids;
    return allGuids.join(",");
  }, [pendingMultichainFunding]);

  const pendingReceiveWithdrawalGuidsKey = useMemo(() => {
    const guids = pendingMultichainFunding
      .filter((item) => item.operation === "withdrawal" && item.step === "sent")
      .map((item) => item.id);
    pendingReceiveWithdrawalGuidsRef.current = guids;
    return guids.join(",");
  }, [pendingMultichainFunding]);

  //#region Deposits

  // TODO MLTCH: make send events listening regardless of srcChainId

  const [sourceChainOftSentQueue, setSourceChainOftSentQueue] = useState<OftSentInfo[]>(EMPTY_ARRAY);

  useEffect(() => {
    if (srcChainId === undefined || !isSettlementChain(chainId) || !currentAccount) {
      return;
    }

    const tokenIdMap = CHAIN_ID_TO_TOKEN_ID_MAP[srcChainId];

    if (!tokenIdMap) {
      return;
    }

    const tokenIdByStargate = keyBy(Object.values(tokenIdMap), (tokenId: MultichainTokenId) => tokenId.stargate);

    const patch: Record<number, MultichainFundingHistoryItem> = {};

    for (let pendingItemIndex = 0; pendingItemIndex < pendingMultichainFunding.length; pendingItemIndex++) {
      const submittedDeposit = pendingMultichainFunding[pendingItemIndex];
      if (submittedDeposit.step !== "submitted" || submittedDeposit.operation !== "deposit") {
        continue;
      }

      const info = sourceChainOftSentQueue.find((item) => item.txnHash === submittedDeposit.sentTxn);
      if (!info) {
        continue;
      }

      const settlementChainId = ENDPOINT_ID_TO_CHAIN_ID[info.dstEid];
      if (settlementChainId !== chainId) {
        return;
      }
      const stargatePoolAddress = info.sender;
      const sourceChainTokenId = tokenIdByStargate[stargatePoolAddress];
      const settlementChainTokenId = getMappedTokenId(sourceChainTokenId.chainId, sourceChainTokenId.address, chainId);
      const tokenAddress = settlementChainTokenId?.address;
      if (!tokenAddress) {
        // eslint-disable-next-line no-console
        console.error("No settlement chain token address for OFTSent event", info);
        continue;
      }
      debugLog("got OFTSent event for", srcChainId, tokenAddress, info.txnHash);

      setSelectedTransferGuid((prev) => {
        if (!prev || prev !== submittedDeposit.id) {
          return prev;
        }
        return info.guid;
      });
      setMultichainFundingPendingIds((prev) => {
        if (submittedDeposit.id in prev) {
          return { ...prev, [submittedDeposit.id]: info.guid };
        }
        return prev;
      });
      const sentAmount = adjustForDecimals(
        info.amountSentLD,
        sourceChainTokenId.decimals,
        settlementChainTokenId.decimals
      );

      patch[pendingItemIndex] = {
        account: currentAccount,
        sentAmount,
        id: info.guid,
        sentTxn: info.txnHash,
        operation: "deposit",
        step: "sent",
        token: tokenAddress,
        sourceChainId: srcChainId,
        settlementChainId: chainId,
        sentTimestamp: submittedDeposit.sentTimestamp,

        executedTimestamp: undefined,
        executedTxn: undefined,
        isExecutionError: undefined,
        receivedAmount: undefined,
        receivedTimestamp: undefined,
        receivedTxn: undefined,

        source: "ws",
      };
    }

    if (Object.keys(patch).length === 0) {
      return;
    }

    setPendingMultichainFunding((prev) => {
      const newPendingMultichainFunding = [...prev];
      for (const [index, item] of Object.entries(patch)) {
        debugLog("patching pending multichain funding item", index, item);
        newPendingMultichainFunding[parseInt(index)] = item;
      }
      return newPendingMultichainFunding;
    });

    const usedTxns = Object.values(patch).map((item) => item.sentTxn);

    setSourceChainOftSentQueue((prev) => {
      return prev.filter((item) => !usedTxns.includes(item.txnHash));
    });
  }, [chainId, currentAccount, pendingMultichainFunding, setSelectedTransferGuid, sourceChainOftSentQueue, srcChainId]);

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

      if (!tokenIdMap) {
        return;
      }

      const sourceChainStargates = Object.values(tokenIdMap).map((tokenId) => tokenId.stargate);

      debugLog("subscribing to OFTSent events for", srcChainId);

      const unsubscribeFromOftSentEvents = subscribeToOftSentEvents(
        wsSourceChainProvider,
        currentAccount,
        sourceChainStargates,
        (info) => {
          setTimeout(function clear() {
            debugLog("clearing OFTSent event for", srcChainId, info.txnHash);
            setSourceChainOftSentQueue((prev) => {
              return prev.filter((item) => item.txnHash !== info.txnHash);
            });
          }, WS_EVENT_CACHE_TIMEOUT_MS);

          setSourceChainOftSentQueue((prev) => {
            return uniqBy(prev.concat(info), (item) => item.txnHash);
          });
        }
      );

      return function cleanup() {
        debugLog("unsubscribing from OFTSent events for", srcChainId);
        unsubscribeFromOftSentEvents();
      };
    },
    [chainId, currentAccount, hasPageLostFocus, setSelectedTransferGuid, srcChainId, wsSourceChainProvider]
  );

  useEffect(
    function subscribeOftReceivedEvents() {
      if (
        hasPageLostFocus ||
        !wsProvider ||
        !isSettlementChain(chainId) ||
        pendingReceiveDepositGuidsRef.current.length === 0
      ) {
        return;
      }

      const tokenIdMap = CHAIN_ID_TO_TOKEN_ID_MAP[chainId];
      const settlementChainStargates = Object.values(tokenIdMap).map((tokenId) => tokenId.stargate);

      const unsubscribeFromOftReceivedEvents = subscribeToOftReceivedEvents(
        wsProvider,
        settlementChainStargates,
        pendingReceiveDepositGuidsRef.current,
        (info) => {
          setPendingMultichainFunding((prev) => {
            const newPendingMultichainFunding = structuredClone(prev);

            const pendingSentDeposit = newPendingMultichainFunding.find(
              (item) => item.operation === "deposit" && item.step === "sent" && item.id === info.guid
            );

            if (!pendingSentDeposit) {
              // eslint-disable-next-line no-console
              console.warn("Got OFTReceive event but no pending deposits were sent from UI");

              return newPendingMultichainFunding;
            }

            debugLog("got OFTReceive event for", chainId, pendingSentDeposit.token, info.txnHash);

            pendingSentDeposit.step = "received";
            // This is already on settlement chain, no need to convert amount
            pendingSentDeposit.receivedAmount = info.amountReceivedLD;
            pendingSentDeposit.receivedTimestamp = nowInSeconds();
            pendingSentDeposit.receivedTxn = info.txnHash;

            return newPendingMultichainFunding;
          });
        }
      );

      const timeoutId = setTimeout(() => {
        setPendingMultichainFunding((prev) => {
          const newPendingMultichainFunding = structuredClone(prev);
          for (const guid of pendingReceiveDepositGuidsRef.current) {
            const pendingSentDepositIndex = newPendingMultichainFunding.findIndex((item) => item.id === guid);
            if (pendingSentDepositIndex !== -1) {
              newPendingMultichainFunding.splice(pendingSentDepositIndex, 1);
            }
          }
          return newPendingMultichainFunding;
        });
      }, SUBSCRIPTION_MAX_TTL_MS);

      return function cleanup() {
        unsubscribeFromOftReceivedEvents?.();
        clearTimeout(timeoutId);
      };
    },
    [chainId, hasPageLostFocus, pendingReceiveDepositGuidsKey, wsProvider]
  );

  useEffect(
    function subscribeComposeDeliveredEvents() {
      if (
        hasPageLostFocus ||
        !wsProvider ||
        !isSettlementChain(chainId) ||
        pendingExecuteDepositGuidsRef.current.length === 0
      ) {
        return;
      }

      const lzEndpoint = CodecUiHelper.getLzEndpoint(chainId);

      const unsubscribeFromComposeDeliveredEvents = subscribeToComposeDeliveredEvents(
        wsProvider,
        lzEndpoint,
        pendingExecuteDepositGuidsRef.current,
        (info) => {
          scheduleMultichainFundingItemClearing([info.guid]);

          setPendingMultichainFunding((prev) => {
            const newPendingMultichainFunding = structuredClone(prev);

            const pendingExecuteDeposit = newPendingMultichainFunding.find((item) => item.id === info.guid);

            if (!pendingExecuteDeposit) {
              // eslint-disable-next-line no-console
              console.warn("[multichain] Got ComposeDelivered event but no pending deposits were received from UI");
              return newPendingMultichainFunding;
            }

            debugLog("got ComposeDelivered event for", chainId, pendingExecuteDeposit.token, info.txnHash);

            pendingExecuteDeposit.step = "executed";
            pendingExecuteDeposit.executedTimestamp = nowInSeconds();
            pendingExecuteDeposit.executedTxn = info.txnHash;
            pendingExecuteDeposit.isExecutionError = false;

            queueSendDepositExecutedMetric(pendingExecuteDeposit);

            return newPendingMultichainFunding;
          });
        }
      );

      const timeoutId = setTimeout(() => {
        setPendingMultichainFunding((prev) => {
          const newPendingMultichainFunding = structuredClone(prev);
          for (const guid of pendingExecuteDepositGuidsRef.current) {
            const pendingExecuteDepositIndex = newPendingMultichainFunding.findIndex((item) => item.id === guid);
            if (pendingExecuteDepositIndex !== -1) {
              newPendingMultichainFunding.splice(pendingExecuteDepositIndex, 1);
            }
          }
          return newPendingMultichainFunding;
        });
      }, SUBSCRIPTION_MAX_TTL_MS);

      return function cleanup() {
        unsubscribeFromComposeDeliveredEvents?.();
        clearTimeout(timeoutId);
      };
    },
    [chainId, hasPageLostFocus, pendingExecuteDepositGuidsKey, scheduleMultichainFundingItemClearing, wsProvider]
  );

  //#endregion Deposits

  //#region Withdrawals

  const [settlementChainOftSentQueue, setSettlementChainOftSentQueue] = useState<OftSentInfo[]>(EMPTY_ARRAY);

  useEffect(() => {
    if (!isSettlementChain(chainId) || !currentAccount) {
      return;
    }

    const tokenIdMap = CHAIN_ID_TO_TOKEN_ID_MAP[chainId];

    if (!tokenIdMap) {
      return;
    }

    const tokenIdByStargate = keyBy(Object.values(tokenIdMap), (tokenId: MultichainTokenId) => tokenId.stargate);

    const patch: Record<number, MultichainFundingHistoryItem> = {};

    for (let pendingItemIndex = 0; pendingItemIndex < pendingMultichainFunding.length; pendingItemIndex++) {
      const submittedWithdrawal = pendingMultichainFunding[pendingItemIndex];
      if (
        submittedWithdrawal.step !== "submitted" ||
        submittedWithdrawal.operation !== "withdrawal" ||
        submittedWithdrawal.sentTxn === undefined
      ) {
        continue;
      }

      const info = settlementChainOftSentQueue.find((item) => item.txnHash === submittedWithdrawal.sentTxn);
      if (!info) {
        continue;
      }

      const sourceChainId = ENDPOINT_ID_TO_CHAIN_ID[info.dstEid];

      if (sourceChainId !== srcChainId) {
        return;
      }

      debugLog("withdrawal got OFTSent event for", srcChainId, info.txnHash);

      const stargatePoolAddress = info.sender;
      const tokenId = tokenIdByStargate[stargatePoolAddress];

      const tokenAddress = tokenId.address;

      setSelectedTransferGuid((prev) => {
        if (!prev || prev !== submittedWithdrawal.id) {
          return prev;
        }

        return info.guid;
      });

      setMultichainFundingPendingIds((prev) => {
        if (submittedWithdrawal.id in prev) {
          return { ...prev, [submittedWithdrawal.id]: info.guid };
        }

        return prev;
      });

      patch[pendingItemIndex] = {
        account: currentAccount,
        // This is on settlement chain, no need to convert amount
        sentAmount: info.amountSentLD,
        id: info.guid,
        sentTxn: info.txnHash,
        operation: "withdrawal",
        step: "sent",
        token: tokenAddress,
        sourceChainId: sourceChainId,
        settlementChainId: chainId,
        sentTimestamp: submittedWithdrawal.sentTimestamp,

        executedTimestamp: undefined,
        executedTxn: undefined,
        isExecutionError: undefined,
        receivedAmount: undefined,
        receivedTimestamp: undefined,
        receivedTxn: undefined,

        source: "ws",
      };
    }

    if (Object.keys(patch).length === 0) {
      return;
    }

    setPendingMultichainFunding((prev) => {
      const newPendingMultichainFunding = [...prev];
      for (const [index, item] of Object.entries(patch)) {
        debugLog("patching pending multichain funding item", index, item);
        newPendingMultichainFunding[parseInt(index)] = item;
      }
      return newPendingMultichainFunding;
    });

    const usedTxns = Object.values(patch).map((item) => item.sentTxn);

    setSettlementChainOftSentQueue((prev) => {
      return prev.filter((item) => !usedTxns.includes(item.txnHash));
    });
  }, [
    chainId,
    currentAccount,
    pendingMultichainFunding,
    setSelectedTransferGuid,
    settlementChainOftSentQueue,
    srcChainId,
  ]);

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

      if (!tokenIdMap) {
        return;
      }

      const settlementChainStargates = Object.values(tokenIdMap).map((tokenId) => tokenId.stargate);

      const unsubscribeFromOftSentEvents = subscribeToOftSentEvents(
        wsProvider,
        getContract(chainId, "LayerZeroProvider"),
        settlementChainStargates,
        (info) => {
          setTimeout(function clear() {
            debugLog("clearing OFTSent event for", chainId, info.txnHash);
            setSettlementChainOftSentQueue((prev) => {
              return prev.filter((item) => item.txnHash !== info.txnHash);
            });
          }, WS_EVENT_CACHE_TIMEOUT_MS);

          debugLog("withdrawal got OFTSent event for", chainId, info.txnHash);
          setSettlementChainOftSentQueue((prev) => {
            return uniqBy(prev.concat(info), (item) => item.txnHash);
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
      const guids = pendingReceiveWithdrawalGuidsRef.current;

      if (
        hasPageLostFocus ||
        !wsSourceChainProvider ||
        !isSettlementChain(chainId) ||
        srcChainId === undefined ||
        guids.length === 0
      ) {
        return;
      }

      const tokenIdMap = CHAIN_ID_TO_TOKEN_ID_MAP[srcChainId];

      if (!tokenIdMap) {
        return;
      }

      const sourceChainStargates = Object.values(tokenIdMap).map((tokenId) => tokenId.stargate);
      const tokenIdByStargate = keyBy(Object.values(tokenIdMap), (tokenId: MultichainTokenId) => tokenId.stargate);

      debugLog("subscribing to source chain OFTReceive events for", srcChainId, guids);

      const unsubscribeFromOftReceivedEvents = subscribeToOftReceivedEvents(
        wsSourceChainProvider,
        sourceChainStargates,
        guids,
        (info) => {
          debugLog("withdrawal on source chain got OFTReceive event for", srcChainId, info.txnHash);

          scheduleMultichainFundingItemClearing([info.guid]);

          setPendingMultichainFunding((prev) => {
            const newPendingMultichainFunding = structuredClone(prev);

            const pendingSentWithdrawal = newPendingMultichainFunding.find(
              (item) => item.id === info.guid && item.step === "sent"
            );

            if (!pendingSentWithdrawal) {
              // eslint-disable-next-line no-console
              console.warn("[multichain] Got OFTReceive event but no pending withdrawals were sent from UI");

              return newPendingMultichainFunding;
            }

            pendingSentWithdrawal.step = "received";

            const sourceChainTokenId = tokenIdByStargate[info.sender];
            const settlementChainTokenId = getMappedTokenId(
              sourceChainTokenId.chainId,
              sourceChainTokenId.address,
              chainId
            );

            if (!sourceChainTokenId || !settlementChainTokenId) {
              // eslint-disable-next-line no-console
              console.warn("No settlement chain token address for OFTReceive event", info);
              return newPendingMultichainFunding;
            }

            const receivedAmount = adjustForDecimals(
              info.amountReceivedLD,
              sourceChainTokenId.decimals,
              settlementChainTokenId.decimals
            );

            pendingSentWithdrawal.receivedAmount = receivedAmount;
            pendingSentWithdrawal.receivedTimestamp = nowInSeconds();
            pendingSentWithdrawal.receivedTxn = info.txnHash;

            return newPendingMultichainFunding;
          });
        }
      );

      // in 5 minutes clean up pending withdrawals that are not received
      const timeoutId = setTimeout(() => {
        setPendingMultichainFunding((prev) => {
          const newPendingMultichainFunding = structuredClone(prev);
          for (const guid of guids) {
            const pendingSentWithdrawalIndex = newPendingMultichainFunding.findIndex((item) => item.id === guid);
            if (pendingSentWithdrawalIndex !== -1) {
              newPendingMultichainFunding.splice(pendingSentWithdrawalIndex, 1);
            }
          }
          return newPendingMultichainFunding;
        });
      }, SUBSCRIPTION_MAX_TTL_MS);

      return function cleanup() {
        unsubscribeFromOftReceivedEvents?.();
        clearTimeout(timeoutId);
      };
    },
    [
      chainId,
      hasPageLostFocus,
      pendingReceiveWithdrawalGuidsKey,
      scheduleMultichainFundingItemClearing,
      srcChainId,
      wsSourceChainProvider,
    ]
  );

  //#endregion Withdrawals

  //#region Approval statuses

  const [sourceChainApprovalActiveListeners, setSourceChainApprovalActiveListeners] =
    useState<Partial<Record<SourceChainId, string[]>>>(EMPTY_OBJECT);
  const [sourceChainApprovalStatuses, setSourceChainApprovalStatuses] = useState<ApprovalStatuses>(EMPTY_OBJECT);

  const sourceChainApprovalUnsubscribersRef = useRef<Partial<Record<SourceChainId, () => void>>>({});
  const sourceChainApprovalCleanupTimersRef = useRef<Partial<Record<SourceChainId, number>>>({});

  useEffect(
    function subscribeMultichainApprovals() {
      if (!currentAccount) {
        return;
      }

      const newUnsubscribers: Partial<Record<SourceChainId, () => void>> = {};

      for (const chainIdString of Object.keys(sourceChainApprovalActiveListeners)) {
        if (
          !sourceChainApprovalActiveListeners[chainIdString] ||
          sourceChainApprovalActiveListeners[chainIdString].length === 0
        ) {
          continue;
        }

        const someSourceChainId = parseInt(chainIdString) as SourceChainId;

        if (sourceChainApprovalCleanupTimersRef.current[someSourceChainId]) {
          debugLog("clearing timeout for source chain approval listener", someSourceChainId);

          clearTimeout(sourceChainApprovalCleanupTimersRef.current[someSourceChainId]);
          delete sourceChainApprovalCleanupTimersRef.current[someSourceChainId];
        }

        if (sourceChainApprovalUnsubscribersRef.current[someSourceChainId]) {
          debugLog("skipping source chain approval listener creation as it already exists", someSourceChainId);
          continue;
        }

        const wsSomeSourceChainProvider = wsSourceChainProviders[someSourceChainId];
        if (!wsSomeSourceChainProvider) {
          debugLog("no ws source chain provider for source chain approval listener", someSourceChainId);
          continue;
        }

        const tokenIdMap = CHAIN_ID_TO_TOKEN_ID_MAP[someSourceChainId];
        const tokenAddresses = Object.values(tokenIdMap)
          .filter((tokenId) => tokenId.address !== zeroAddress)
          .map((tokenId) => tokenId.address);
        const stargates = Object.values(tokenIdMap)
          .filter((tokenId) => tokenId.address !== zeroAddress)
          .map((tokenId) => tokenId.stargate);

        debugLog("subscribing to source chain approval events for", someSourceChainId);
        const unsubscribeApproval = subscribeToMultichainApprovalEvents(
          wsSomeSourceChainProvider,
          currentAccount,
          tokenAddresses,
          stargates,
          (tokenAddress, spender, value) => {
            debugLog("got approval event for", someSourceChainId, tokenAddress, spender, value);

            setSourceChainApprovalStatuses((old) => ({
              ...old,
              [tokenAddress]: {
                ...old[tokenAddress],
                [spender]: { value, createdAt: Date.now() },
              },
            }));
          }
        );

        newUnsubscribers[someSourceChainId] = unsubscribeApproval;
      }

      sourceChainApprovalUnsubscribersRef.current = {
        ...sourceChainApprovalUnsubscribersRef.current,
        ...newUnsubscribers,
      };

      return function cleanup() {
        for (const chainIdString of Object.keys(newUnsubscribers)) {
          const someSourceChainId = parseInt(chainIdString) as SourceChainId;

          debugLog("scheduling timeout for source chain approval listener", someSourceChainId);

          const timerId = window.setTimeout(() => {
            debugLog("clearing source chain approval listener", someSourceChainId);
            newUnsubscribers[someSourceChainId]?.();
            delete sourceChainApprovalUnsubscribersRef.current[someSourceChainId];
            // eslint-disable-next-line react-hooks/exhaustive-deps
            delete sourceChainApprovalCleanupTimersRef.current[someSourceChainId];
          }, SOURCE_CHAIN_APPROVAL_LISTENER_CLEANUP_DELAY_MS);

          sourceChainApprovalCleanupTimersRef.current[someSourceChainId] = timerId;
        }
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentAccount, JSON.stringify(sourceChainApprovalActiveListeners), wsSourceChainProviders]
  );

  const multichainEventsState = useMemo(
    (): MultichainEventsState => ({
      pendingMultichainFunding,
      multichainFundingPendingIds,
      setMultichainSubmittedDeposit: (submittedEvent) => {
        if (!currentAccount) {
          return;
        }

        const stubId = `<stub-${Date.now()}>`;
        setPendingMultichainFunding((prev) => {
          const newPendingMultichainFunding = structuredClone(prev);
          newPendingMultichainFunding.push({
            account: currentAccount,
            id: stubId,
            operation: "deposit",
            step: "submitted",
            settlementChainId: chainId,
            sourceChainId: submittedEvent.sourceChainId,
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

            source: "optimistic",
          });
          return newPendingMultichainFunding;
        });

        setMultichainFundingPendingIds((prev) => ({ ...prev, [stubId]: stubId }));

        return stubId;
      },
      setMultichainSubmittedWithdrawal: (submittedEvent) => {
        if (!currentAccount) {
          return;
        }

        const stubId = `<stub-${Date.now()}>`;
        setPendingMultichainFunding((prev) => {
          const newPendingMultichainFunding = structuredClone(prev);
          newPendingMultichainFunding.push({
            account: currentAccount,
            id: stubId,
            operation: "withdrawal",
            step: "submitted",
            settlementChainId: chainId,
            sourceChainId: submittedEvent.sourceChainId,
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

            source: "optimistic",
          });
          return newPendingMultichainFunding;
        });

        setMultichainFundingPendingIds((prev) => ({ ...prev, [stubId]: stubId }));

        return stubId;
      },
      setMultichainWithdrawalSentTxnHash: (mockId, txnHash) => {
        setPendingMultichainFunding((prev) => {
          const newPendingMultichainFunding = structuredClone(prev);
          const submittedWithdrawalIndex = newPendingMultichainFunding.findIndex((item) => item.id === mockId);
          debugLog("Setting multichain withdrawal sent txn hash");
          if (submittedWithdrawalIndex !== -1) {
            const submittedWithdrawal = newPendingMultichainFunding[submittedWithdrawalIndex];
            submittedWithdrawal.sentTxn = txnHash;
            submittedWithdrawal.sentTimestamp = nowInSeconds();
          }
          return newPendingMultichainFunding;
        });
      },
      setMultichainWithdrawalSentError: (mockId) => {
        setPendingMultichainFunding((prev) => {
          const newPendingMultichainFunding = structuredClone(prev);
          const submittedWithdrawalIndex = newPendingMultichainFunding.findIndex((item) => item.id === mockId);
          if (submittedWithdrawalIndex !== -1) {
            newPendingMultichainFunding.splice(submittedWithdrawalIndex, 1);
          }
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
      setMultichainSourceChainApprovalsActiveListener: (chainId: SourceChainId, name: string) => {
        setSourceChainApprovalActiveListeners((old) => {
          const newListeners = structuredClone(old);
          newListeners[chainId] = [...(newListeners[chainId] || []), name];
          return newListeners;
        });
      },
      removeMultichainSourceChainApprovalsActiveListener: (chainId: SourceChainId, name: string) => {
        setSourceChainApprovalActiveListeners((old) => {
          const newListeners = structuredClone(old);
          newListeners[chainId] = newListeners[chainId]?.filter((listener) => listener !== name) || [];
          return newListeners;
        });
      },
      updatePendingMultichainFunding: (items) => {
        const intermediateStepGuids = getIntermediateStepGuids(pendingMultichainFunding);

        const updatedPendingItems: Record<string, MultichainFundingHistoryItem> = {};
        let hasUpdatedPendingUpdates = false;

        for (const item of items) {
          if (intermediateStepGuids.has(item.id)) {
            updatedPendingItems[item.id] = item;
            hasUpdatedPendingUpdates = true;
          }
        }

        if (hasUpdatedPendingUpdates) {
          setPendingMultichainFunding((prev) => {
            const newPendingMultichainFunding = structuredClone(prev);

            const executedGuids = progressMultichainFundingItems({
              pendingMultichainFunding: newPendingMultichainFunding,
              updatedPendingItems,
            });

            scheduleMultichainFundingItemClearing(executedGuids);

            return newPendingMultichainFunding;
          });
        }
      },
      removeMultichainFundingPendingIds: (ids: string | string[]) => {
        ids = typeof ids === "string" ? [ids] : ids;
        setMultichainFundingPendingIds((prev) => {
          const newIds = { ...prev };
          for (const id of ids) {
            delete newIds[id];
          }
          return newIds;
        });
      },
    }),
    [
      pendingMultichainFunding,
      multichainFundingPendingIds,
      sourceChainApprovalStatuses,
      currentAccount,
      chainId,
      setSelectedTransferGuid,
      scheduleMultichainFundingItemClearing,
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

function getIntermediateStepGuids(pendingMultichainFunding: PendingMultichainFunding): Set<string> {
  const intermediateStepGuids = new Set<string>();

  for (const item of pendingMultichainFunding) {
    if (item.operation === "deposit") {
      if (item.step === "received" || item.step === "sent") {
        intermediateStepGuids.add(item.id);
      }
    } else if (item.operation === "withdrawal") {
      if (item.step === "sent") {
        intermediateStepGuids.add(item.id);
      }
    }
  }

  return intermediateStepGuids;
}

function progressMultichainFundingItems({
  pendingMultichainFunding,
  updatedPendingItems,
}: {
  pendingMultichainFunding: PendingMultichainFunding;
  updatedPendingItems: Record<string, MultichainFundingHistoryItem>;
}) {
  const executedGuids: string[] = [];

  for (let index = 0; index < pendingMultichainFunding.length; index++) {
    const item = pendingMultichainFunding[index];
    const freshItem = updatedPendingItems[item.id];

    if (!freshItem) {
      continue;
    }

    if (item.operation === "deposit") {
      if (item.step === "received" || item.step === "sent") {
        if (isStepGreater(freshItem.step, item.step)) {
          pendingMultichainFunding[index] = freshItem;

          if (freshItem.step === "executed") {
            executedGuids.push(item.id);
            queueSendDepositExecutedMetric(freshItem);
          }
        }
      }
    } else if (item.operation === "withdrawal") {
      if (item.step === "sent") {
        if (isStepGreater(freshItem.step, item.step)) {
          pendingMultichainFunding[index] = freshItem;

          if (freshItem.step === "received") {
            executedGuids.push(item.id);
            queueSendWithdrawalReceivedMetric(freshItem);
          }
        }
      }
    }
  }

  return executedGuids;
}

function queueSendDepositExecutedMetric(deposit: MultichainFundingHistoryItem) {
  const token = getToken(deposit.settlementChainId, deposit.token);
  const metricId = getMultichainDepositMetricId({
    settlementChain: deposit.settlementChainId,
    sourceChain: deposit.sourceChainId,
    assetSymbol: token.symbol,
  });

  const cache = metrics.getCachedMetricData<MultichainDepositMetricData>(metricId);
  if (cache) {
    sendMultichainDepositSuccessEvent({
      settlementChain: getChainName(deposit.settlementChainId),
      sourceChain: getChainName(deposit.sourceChainId),
      asset: token.symbol,
      sizeInUsd: cache.sizeInUsd,
      isFirstTime: cache.isFirstDeposit,
    });
  }

  sendOrderExecutedMetric(metricId);
}

function queueSendWithdrawalReceivedMetric(withdrawal: MultichainFundingHistoryItem) {
  const token = getToken(withdrawal.settlementChainId, withdrawal.token);
  const metricId = getMultichainWithdrawalMetricId({
    settlementChain: withdrawal.settlementChainId,
    sourceChain: withdrawal.sourceChainId,
    assetSymbol: token.symbol,
  });

  const cache = metrics.getCachedMetricData<MultichainWithdrawalMetricData>(metricId);
  if (cache) {
    sendMultichainWithdrawalSuccessEvent({
      settlementChain: getChainName(withdrawal.settlementChainId),
      sourceChain: getChainName(withdrawal.sourceChainId),
      asset: token.symbol,
      sizeInUsd: cache.sizeInUsd,
      isFirstTime: cache.isFirstWithdrawal,
    });
  }

  sendOrderExecutedMetric(metricId);
}

export function useMultichainApprovalsActiveListener(chainId: SourceChainId | undefined, name: string) {
  const { setMultichainSourceChainApprovalsActiveListener, removeMultichainSourceChainApprovalsActiveListener } =
    useSyntheticsEvents();

  useWsAdditionalSourceChains(chainId, name);

  useEffect(() => {
    if (!chainId) {
      return;
    }

    setMultichainSourceChainApprovalsActiveListener(chainId, name);

    return () => {
      removeMultichainSourceChainApprovalsActiveListener(chainId, name);
    };
  }, [
    chainId,
    name,
    setMultichainSourceChainApprovalsActiveListener,
    removeMultichainSourceChainApprovalsActiveListener,
  ]);
}
