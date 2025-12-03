/* eslint-disable no-console */
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
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
import ExternalLink from "components/ExternalLink/ExternalLink";
import Loader from "components/Loader/Loader";
import PageTitle from "components/PageTitle/PageTitle";
import { Table, TableTd, TableTh, TableTr } from "components/Table/Table";

type EventLogEntry = {
  eventName: string;
  eventType: "EventLog1" | "EventLog2";
  txHash: string;
  blockNumber: bigint;
  timestamp: number;
  eventData: any;
  topics: string[];
};

function useAccountEvents(account: string | undefined, chainId: ContractsChainId) {
  const [events, setEvents] = useState<EventLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromBlock, setFromBlock] = useState<bigint | null>(null);
  const [fromTimestamp, setFromTimestamp] = useState<number | null>(null);

  useEffect(() => {
    if (!account) {
      return;
    }

    let isMounted = true;

    async function fetchEvents() {
      setLoading(true);
      setError(null);

      try {
        const eventEmitterAddress = getContract(chainId, "EventEmitter");
        const client = getPublicClientWithRpc(chainId);

        // Get current block and calculate block from 7 days ago
        const currentBlock = await client.getBlockNumber();
        const currentBlockData = await client.getBlock({ blockNumber: currentBlock });
        const daysBack = 7;
        const secondsInDay = 86400n;
        const timestamp7DaysAgo = currentBlockData.timestamp - BigInt(daysBack) * secondsInDay;
        const startBlock = await getBlockNumberBeforeTimestamp(chainId, timestamp7DaysAgo);
        const startBlockData = await client.getBlock({ blockNumber: startBlock });

        setFromBlock(startBlock);
        setFromTimestamp(Number(startBlockData.timestamp));

        console.log(`Fetching events from block ${startBlock} to ${currentBlock}`);

        // Encode account address as bytes32 for topic filtering using viem
        if (!account) {
          throw new Error("Account is required");
        }
        const accountTopicBytes32 = encodeAbiParameters([{ type: "address" }], [account]);

        // Fetch EventLog1 and EventLog2 in parallel
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

        const allLogs: Array<{
          eventName: string;
          eventType: "EventLog1" | "EventLog2";
          txHash: string;
          blockNumber: bigint;
          eventData: any;
          topics: string[];
        }> = [];

        // Process EventLog1 results
        if (logs1Result.status === "fulfilled") {
          for (const log of logs1Result.value) {
            allLogs.push({
              eventName: String(log.args.eventName),
              eventType: "EventLog1",
              txHash: log.transactionHash,
              blockNumber: log.blockNumber,
              eventData: log.args.eventData,
              topics: log.topics,
            });
          }
        } else {
          console.error("Error fetching EventLog1:", logs1Result.reason);
        }

        // Process EventLog2 results
        if (logs2Result.status === "fulfilled") {
          for (const log of logs2Result.value) {
            allLogs.push({
              eventName: String(log.args.eventName),
              eventType: "EventLog2",
              txHash: log.transactionHash,
              blockNumber: log.blockNumber,
              eventData: log.args.eventData,
              topics: log.topics,
            });
          }
        } else {
          console.error("Error fetching EventLog2:", logs2Result.reason);
        }

        // Return logs immediately with placeholder timestamps, sorted by block number (newest first)
        const initialEvents: EventLogEntry[] = allLogs
          .map((log) => ({
            ...log,
            timestamp: 0,
          }))
          .sort((a, b) => Number(b.blockNumber - a.blockNumber));

        if (!isMounted) return;

        setEvents(initialEvents);
        setLoading(false);

        // Fetch blocks asynchronously and update events once loaded
        const uniqueBlockNumbers = Array.from(new Set(allLogs.map((log) => log.blockNumber)));
        const blockMap = new Map<bigint, number>();

        // Fetch all blocks in parallel without blocking the return
        Promise.all(
          uniqueBlockNumbers.map(async (blockNumber) => {
            try {
              const block = await client.getBlock({ blockNumber });
              blockMap.set(blockNumber, Number(block.timestamp));
            } catch (err) {
              console.error(`Error fetching block ${blockNumber}:`, err);
            }
          })
        ).then(() => {
          if (!isMounted) return;

          // Update events with real timestamps once blocks are loaded
          // Keep sorted by block number (newest first)
          const eventsWithTimestamps: EventLogEntry[] = allLogs
            .map((log) => ({
              ...log,
              timestamp: blockMap.get(log.blockNumber) ?? 0,
            }))
            .sort((a, b) => Number(b.blockNumber - a.blockNumber));

          setEvents(eventsWithTimestamps);
        });
      } catch (err) {
        if (!isMounted) return;

        const error = err instanceof Error ? err : new Error(String(err));
        setError(error.message);
        setLoading(false);
        console.error("Error fetching events:", error);
      }
    }

    fetchEvents();

    return () => {
      isMounted = false;
    };
  }, [account, chainId]);

  return { events, loading, error, fromBlock, fromTimestamp };
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

  const { events, loading, error, fromBlock, fromTimestamp } = useAccountEvents(
    account,
    initialChainId as ContractsChainId
  );

  const formatEventData = (eventData: unknown) => {
    if (!eventData) return "N/A";

    try {
      const parsed = parseEventLogData(eventData as Parameters<typeof parseEventLogData>[0]);
      const parts: string[] = [];

      // Iterate through all item types
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

        // Process items (object with key-value pairs)
        if (section.items) {
          for (const [itemKey, value] of Object.entries(section.items)) {
            parts.push(`${itemKey}: ${String(value)}`);
          }
        }

        // Process arrayItems (object with key-array pairs)
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
          <PageTitle title="Account Events" className="p-12" />
          <div className="text-center text-red-500">
            Please connect your wallet or provide an account address in the URL
          </div>
        </div>
      </AppPageLayout>
    );
  }

  return (
    <AppPageLayout>
      <div className="default-container page-layout">
        <PageTitle
          title="Account Events"
          subtitle={
            <div className="text-body-medium mb-20">
              <div className="mb-8 flex items-center gap-4">
                <span>Events for account:</span>
                <AddressView noLink address={account} size={20} />
              </div>
              {fromBlock !== null && fromTimestamp !== null && (
                <div className="text-12 text-typography-secondary">
                  From: Block {fromBlock.toString()} ({format(fromTimestamp * 1000, "dd MMM yyyy, HH:mm:ss")})
                </div>
              )}
            </div>
          }
          className="p-12"
        />

        {loading && (
          <div className="flex justify-center p-40">
            <Loader />
          </div>
        )}

        {error && <div className="p-20 text-center text-red-500">Error: {error}</div>}

        {!loading && !error && (
          <div className="text-body-medium mb-20">Found {events.length} events in the past 7 days</div>
        )}

        {!loading && events.length > 0 && (
          <Table>
            <thead>
              <TableTr>
                <TableTh>Event Name</TableTh>
                <TableTh>Type</TableTh>
                <TableTh>Time</TableTh>
                <TableTh>Transaction</TableTh>
                <TableTh>Event Data</TableTh>
              </TableTr>
            </thead>
            <tbody>
              {events.map((event, idx) => (
                <TableTr key={`${event.txHash}-${idx}`}>
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
              ))}
            </tbody>
          </Table>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="p-40 text-center text-typography-secondary">
            No events found for this account in the past 7 days
          </div>
        )}
      </div>
    </AppPageLayout>
  );
}
