import { signature as solanaSignature } from "@solana/kit";

import { getIsSolanaNetworkEnabled } from "config/ab";
import { createAnySignal } from "lib/abortSignalHelpers";
import { getSolanaRpc } from "lib/solana/rpc";

import { getCreatedOrderActions } from "./getCreatedOrderActions";
import type { OrderLifecycleResult, TrackedOrderAction } from "./reduceOrderLifecycle";
import { watchOrderLifecycle } from "./watchOrderLifecycle";

export type OrderTrackingRequest = {
  signature: string;
  slot: bigint;
  owner: string;
  orderAddresses: readonly string[];
};

const IDENTIFICATION_MAX_AGE_MS = 60_000;

export async function watchSubmittedOrders({
  orders,
  requests,
  signal,
  onUpdate,
}: {
  orders: readonly TrackedOrderAction[];
  requests: readonly OrderTrackingRequest[];
  signal: AbortSignal;
  onUpdate: (result: OrderLifecycleResult) => void;
}) {
  const known = new Set(orders.map((order) => `${order.creationSignature}:${order.order}`));
  const unresolvedRequests = requests.filter((request) =>
    request.orderAddresses.some((order) => !known.has(`${request.signature}:${order}`))
  );
  const recovered = await Promise.all(
    unresolvedRequests.map(async (request): Promise<TrackedOrderAction[] | undefined> => {
      const deadline = Date.now() + IDENTIFICATION_MAX_AGE_MS;
      while (!signal.aborted && getIsSolanaNetworkEnabled() && Date.now() < deadline) {
        try {
          const receipt = await getSolanaRpc()
            .getTransaction(solanaSignature(request.signature), {
              encoding: "json",
              commitment: "confirmed",
              maxSupportedTransactionVersion: 0,
            })
            .send({ abortSignal: createAnySignal([signal, AbortSignal.timeout(20_000)]) });
          return getCreatedOrderActions({ ...request, receipt });
        } catch (error) {
          if (signal.aborted) throw error;
          // A confirmed send remains confirmed while its creation receipt is indexing.
        }
        await new Promise<void>((resolve) => {
          const finish = () => {
            clearTimeout(timer);
            signal.removeEventListener("abort", finish);
            resolve();
          };
          const timer = setTimeout(finish, 2_000);
          signal.addEventListener("abort", finish, { once: true });
          if (signal.aborted) finish();
        });
      }
      return undefined;
    })
  );
  if (signal.aborted || recovered.some((value) => value === undefined)) return;
  const actions = new Map(
    [...orders, ...recovered.flatMap((value) => value ?? [])].map((action) => [
      `${action.creationSignature}:${action.order}`,
      action,
    ])
  );
  const markets = [...actions.values()].filter(
    (order) => order.kind === "MarketIncrease" || order.kind === "MarketDecrease"
  );
  // The entry flow creates one primary order with optional triggers. Never report an entire batch
  // filled from one member when a future consumer submits multiple primary market orders.
  if (markets.length !== 1) return;
  await watchOrderLifecycle({ action: markets[0], signal, onUpdate });
}
