/* eslint-disable no-console */
import cx from "classnames";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import useSWR from "swr";
import { encodeAbiParameters, getAbiItem, isAddress } from "viem";
import { useAccount } from "wagmi";

import { ContractsChainId } from "config/chains";
import { getContract } from "config/contracts";
import type { EventLogData } from "context/SyntheticsEvents/types";
import { parseEventLogData } from "context/WebsocketContext/subscribeToEvents";
import { getBlockNumberBeforeTimestamp } from "domain/multichain/progress/getBlockNumberByTimestamp";
import { useChainId } from "lib/chains";
import { CHAIN_ID_TO_TX_URL_BUILDER } from "lib/chains/blockExplorers";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { abis } from "sdk/abis";

import AddressView from "components/AddressView/AddressView";
import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Loader from "components/Loader/Loader";
import PageTitle from "components/PageTitle/PageTitle";
import { Table, TableTd, TableTh, TableTr } from "components/Table/Table";
import { t, Trans } from "@lingui/macro";

type EventLogEntry = {
  eventName: string;
  eventType: "EventLog1" | "EventLog2";
  txHash: string;
  blockNumber: bigint;
  logIndex: number;
  timestamp: number;
  eventData: any;
  topics: string[];
};

type EventLogEntryWithoutTimestamp = Omit<EventLogEntry, "timestamp">;

type AccountEventsData = {
  events: EventLogEntryWithoutTimestamp[];
  fromBlock: bigint;
  fromTimestamp: number;
};

const DAYS_BACK = 7;
const SECONDS_IN_DAY = 86400;

const blockTimestampCache = new Map<string, Map<bigint, number>>();

function getCacheKey(chainId: ContractsChainId, blockNumbers: bigint[]): string {
  const sorted = [...blockNumbers].sort((a, b) => Number(a - b));
  return `${chainId}-${sorted.map(String).join(",")}`;
}

function useBlockTimestamps(chainId: ContractsChainId, blockNumbers: bigint[]) {
  const [timestampsMap, setTimestampsMap] = useState<Map<bigint, number>>(new Map());

  useEffect(() => {
    if (blockNumbers.length === 0) {
      setTimestampsMap(new Map());
      return;
    }

    const cacheKey = getCacheKey(chainId, blockNumbers);
    const cached = blockTimestampCache.get(cacheKey);

    if (cached) {
      setTimestampsMap(cached);
      return;
    }

    const client = getPublicClientWithRpc(chainId);
    const uniqueBlockNumbers = Array.from(new Set(blockNumbers));

    Promise.all(
      uniqueBlockNumbers.map(async (blockNumber) => {
        try {
          const block = await client.getBlock({ blockNumber });
          return [blockNumber, Number(block.timestamp)] as const;
        } catch (err) {
          console.error(`Error fetching block ${blockNumber}:`, err);
          return [blockNumber, 0] as const;
        }
      })
    ).then((timestamps) => {
      const newMap = new Map(timestamps);
      blockTimestampCache.set(cacheKey, newMap);
      setTimestampsMap(newMap);
    });
  }, [chainId, blockNumbers]);

  return timestampsMap;
}

async function fetchAccountEvents(account: string, chainId: ContractsChainId): Promise<AccountEventsData> {
  const eventEmitterAddress = getContract(chainId, "EventEmitter");
  const client = getPublicClientWithRpc(chainId);

  const currentBlock = await client.getBlockNumber();
  const currentBlockData = await client.getBlock({ blockNumber: currentBlock });
  const timestamp7DaysAgo = currentBlockData.timestamp - BigInt(DAYS_BACK) * BigInt(SECONDS_IN_DAY);
  const startBlock = await getBlockNumberBeforeTimestamp(chainId, timestamp7DaysAgo);
  const startBlockData = await client.getBlock({ blockNumber: startBlock });

  console.log(`Fetching events from block ${startBlock} to ${currentBlock}`);

  const accountTopicBytes32 = encodeAbiParameters([{ type: "address" }], [account]);

  const eventLog1AbiItem = getAbiItem({ abi: abis.EventEmitter, name: "EventLog1" });
  const eventLog2AbiItem = getAbiItem({ abi: abis.EventEmitter, name: "EventLog2" });

  const [logs1Result, logs2Result] = await Promise.allSettled([
    client.getLogs({
      address: eventEmitterAddress,
      event: eventLog1AbiItem,
      args: {
        topic1: accountTopicBytes32,
      },
      fromBlock: startBlock,
      toBlock: currentBlock,
    }),
    client.getLogs({
      address: eventEmitterAddress,
      event: eventLog2AbiItem,
      args: {
        topic2: accountTopicBytes32,
      },
      fromBlock: startBlock,
      toBlock: currentBlock,
    }),
  ]);

  const allLogs: EventLogEntryWithoutTimestamp[] = [];

  if (logs1Result.status === "fulfilled") {
    for (const log of logs1Result.value) {
      allLogs.push({
        eventName: String(log.args.eventName),
        eventType: "EventLog1",
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        logIndex: log.logIndex,
        eventData: log.args.eventData,
        topics: log.topics,
      });
    }
  } else {
    console.error("Error fetching EventLog1:", logs1Result.reason);
  }

  if (logs2Result.status === "fulfilled") {
    for (const log of logs2Result.value) {
      allLogs.push({
        eventName: String(log.args.eventName),
        eventType: "EventLog2",
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        logIndex: log.logIndex,
        eventData: log.args.eventData,
        topics: log.topics,
      });
    }
  } else {
    console.error("Error fetching EventLog2:", logs2Result.reason);
  }

  const sortedEvents = allLogs.sort((a, b) => {
    const blockDiff = Number(b.blockNumber - a.blockNumber);
    if (blockDiff !== 0) return blockDiff;
    // new events first
    return b.logIndex - a.logIndex;
  });

  return {
    events: sortedEvents,
    fromBlock: startBlock,
    fromTimestamp: Number(startBlockData.timestamp),
  };
}

export function AccountEvents() {
  const { chainId: initialChainId } = useChainId();
  const { address: walletAddress } = useAccount();
  const params = useParams<{ account?: string }>();

  const account = useMemo(() => {
    const paramAccount = params.account;
    if (paramAccount && isAddress(paramAccount)) {
      return paramAccount;
    }
    return walletAddress;
  }, [params.account, walletAddress]);

  const swrKey = account && initialChainId ? ["accountEvents", account, initialChainId] : null;

  const { data, error, isLoading, mutate } = useSWR<AccountEventsData>(
    swrKey,
    ([, account, chainId]: [string, string, ContractsChainId]) => fetchAccountEvents(account, chainId),
    {
      keepPreviousData: true,
    }
  );

  const eventsWithoutTimestamps = useMemo(() => data?.events ?? [], [data?.events]);
  const fromBlock = data?.fromBlock ?? null;
  const fromTimestamp = data?.fromTimestamp ?? null;

  const uniqueBlockNumbers = useMemo(() => {
    return Array.from(new Set(eventsWithoutTimestamps.map((event) => event.blockNumber)));
  }, [eventsWithoutTimestamps]);

  const blockTimestampsMap = useBlockTimestamps(initialChainId, uniqueBlockNumbers);

  const events: EventLogEntry[] = useMemo(() => {
    return eventsWithoutTimestamps.map((event) => ({
      ...event,
      timestamp: blockTimestampsMap.get(event.blockNumber) ?? 0,
    }));
  }, [eventsWithoutTimestamps, blockTimestampsMap]);

  const formatEventData = (eventData: unknown) => {
    if (!eventData) return t`N/A`;

    try {
      const parsed = parseEventLogData(eventData as Parameters<typeof parseEventLogData>[0]);
      const parts: string[] = [];

      const itemTypes: Array<keyof EventLogData> = [
        "addressItems",
        "uintItems",
        "intItems",
        "boolItems",
        "bytes32Items",
        "bytesItems",
        "stringItems",
      ];

      for (const key of itemTypes) {
        const section = parsed[key];
        if (!section) continue;

        if (section.items) {
          for (const [itemKey, value] of Object.entries(section.items)) {
            parts.push(`${itemKey}: ${String(value)}`);
          }
        }

        if (section.arrayItems) {
          for (const [itemKey, values] of Object.entries(section.arrayItems)) {
            const formattedValues = Array.isArray(values) ? values.map(String).join(", ") : String(values);
            parts.push(`${itemKey}: [${formattedValues}]`);
          }
        }
      }

      return parts.length > 0 ? parts.join(", ") : JSON.stringify(eventData).slice(0, 100);
    } catch (_err) {
      return JSON.stringify(eventData).slice(0, 100);
    }
  };

  if (!account) {
    return (
      <AppPageLayout>
        <div className="default-container page-layout">
          <PageTitle title={t`Account events`} className="p-12" />
          <div className="text-center text-red-500">
            <Trans>Please connect your wallet or provide an account address in the URL</Trans>
          </div>
        </div>
      </AppPageLayout>
    );
  }

  return (
    <AppPageLayout>
      <div className="default-container page-layout">
        <PageTitle
          title={t`Account events`}
          subtitle={
            <div className="text-body-medium mb-20">
              <div className="mb-8 flex items-center gap-4">
                <span>
                  <Trans>Events for account:</Trans>
                </span>
                <AddressView noLink address={account} size={20} />
              </div>
              {fromBlock !== null && fromTimestamp !== null && (
                <div className="text-12 text-typography-secondary">
                  <Trans>
                    From: Block {fromBlock.toString()} ({format(fromTimestamp * 1000, "dd MMM yyyy, HH:mm:ss")})
                  </Trans>
                </div>
              )}
            </div>
          }
          className="p-12"
        />

        {error && (
          <div className="mb-20 p-20 text-center text-red-500">
            <Trans>Error:</Trans> {error instanceof Error ? error.message : String(error)}
            <div className="mt-8">
              <Button variant="secondary" onClick={() => mutate()} disabled={isLoading}>
                {isLoading ? t`Loading...` : t`Retry`}
              </Button>
            </div>
          </div>
        )}

        {!error && (
          <>
            <div className="mb-20 flex items-center justify-between">
              <div className="text-body-medium">
                <Trans>
                  Found {events.length} events in the past {DAYS_BACK} days
                </Trans>
              </div>
              <Button variant="secondary" onClick={() => mutate()} disabled={isLoading}>
                {isLoading ? t`Loading...` : t`Refresh`}
              </Button>
            </div>
            {isLoading && events.length === 0 && (
              <div className="mb-20 flex justify-center">
                <Loader />
              </div>
            )}
          </>
        )}

        {!isLoading && events.length > 0 && (
          <Table>
            <thead>
              <TableTr>
                <TableTh>
                  <Trans>EVENT NAME</Trans>
                </TableTh>
                <TableTh>
                  <Trans>TYPE</Trans>
                </TableTh>
                <TableTh>
                  <Trans>TIME</Trans>
                </TableTh>
                <TableTh>
                  <Trans>TRANSACTION</Trans>
                </TableTh>
                <TableTh>
                  <Trans>EVENT DATA</Trans>
                </TableTh>
              </TableTr>
            </thead>
            <tbody>
              {events.map((event) => {
                const eventNameLower = event.eventName.toLowerCase();
                const isCancelled = eventNameLower.includes("cancelled") || eventNameLower.includes("failed");
                const isCreated = eventNameLower.includes("created");
                const isExecuted = eventNameLower.includes("executed");

                return (
                  <TableTr
                    key={`${event.txHash}-${event.logIndex}`}
                    className={cx({
                      "!bg-red-500/20": isCancelled,
                      "!bg-blue-500/20": isCreated,
                      "!bg-green-500/20": isExecuted,
                    })}
                  >
                    <TableTd>
                      <div className="font-medium">{event.eventName}</div>
                    </TableTd>
                    <TableTd>
                      <div className="text-12 text-typography-secondary">{event.eventType}</div>
                    </TableTd>
                    <TableTd>
                      <div>
                        {event.timestamp === 0 ? (
                          <span className="text-typography-secondary">...</span>
                        ) : (
                          format(event.timestamp * 1000, "dd MMM yyyy, HH:mm:ss")
                        )}
                      </div>
                    </TableTd>
                    <TableTd>
                      <ExternalLink href={CHAIN_ID_TO_TX_URL_BUILDER[initialChainId](event.txHash)}>
                        {event.txHash.slice(0, 10)}...
                      </ExternalLink>
                    </TableTd>
                    <TableTd>
                      <div
                        className="max-w-400 overflow-hidden text-ellipsis text-12"
                        title={formatEventData(event.eventData)}
                      >
                        {formatEventData(event.eventData)}
                      </div>
                    </TableTd>
                  </TableTr>
                );
              })}
            </tbody>
          </Table>
        )}

        {!isLoading && !error && events.length === 0 && (
          <div className="p-40 text-center text-typography-secondary">
            <Trans>No events found for this account in the past {DAYS_BACK} days</Trans>
          </div>
        )}
      </div>
    </AppPageLayout>
  );
}
