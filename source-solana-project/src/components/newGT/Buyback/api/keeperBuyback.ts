import { gql } from '@apollo/client';
import { print } from 'graphql';
import { MARIN_GRAPHQL_ENDPOINT } from '@/config/url';
import {
  REQUEST_STATUS_FAILURE,
  REQUEST_STATUS_POLL_INTERVAL_MS,
  REQUEST_STATUS_POLL_MAX_ATTEMPTS,
} from '../buybackConstants';
import type {
  GtBuybackBurnSubmitResult,
  GtBuybackRequestStatusResult,
  GtBuybackSummary,
} from '../types';

type GraphQlErrorBody = {
  message?: string;
};

type GraphQlResponse<T> = {
  data?: T;
  errors?: GraphQlErrorBody[];
};

async function keeperGraphql<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  if (!MARIN_GRAPHQL_ENDPOINT) {
    throw new Error('VITE_MARIN_GRAPHQL_ENDPOINT is not configured');
  }

  const response = await fetch(MARIN_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Marin GraphQL HTTP ${response.status}`);
  }

  const json = (await response.json()) as GraphQlResponse<T>;
  if (json.errors?.length) {
    throw new Error(
      json.errors.map((e) => e.message ?? 'Unknown GraphQL error').join('; ')
    );
  }
  if (!json.data) {
    throw new Error('Marin GraphQL returned empty data');
  }
  return json.data;
}

const GT_BUYBACK_SUMMARY_QUERY = gql`
  query GtBuybackSummary(
    $store: StringPubkey
    $owner: StringPubkey!
    $requestedGtAmount: StringNumber
  ) {
    gtBuybackSummary(
      store: $store
      owner: $owner
      requestedGtAmount: $requestedGtAmount
    ) {
      store
      owner
      marketPeriodIndex
      periodStartTimestamp
      periodEndTimestamp
      nextBuybackTimestamp
      currentMintingPrice
      maxBuybackValueUsdcAmount
      maxBuybackValueUpdatedAt
      nextMaxBuybackValueRefreshAt
      globalQueuedGt
      userQuotaExists
      userTotalQuotaGt
      userConfirmedSoldGt
      userQueuedGt
      userRemainingGt
      requestedGtAmount
      quotedGtAmount
      estimatedBuybackPrice
      estimatedSellProceedsUsdcAmount
      myBuybackParticipation {
        userParticipatingGt
        userQueuedGt
        userBurnSubmittedGt
        userBurnConfirmedGt
        userPayoutSubmittedGt
        userSettledGt
        userFailedGt
        userEstimatedSellProceedsUsdcAmount
        storedEstimatedPayoutUsdcAmount
        finalPayoutUsdcAmount
      }
    }
  }
`;

const GT_BUYBACK_REQUEST_STATUS_QUERY = gql`
  query GtBuybackRequestStatus($signature: String!) {
    gtBuybackRequestStatus(signature: $signature) {
      signature
      status
      failureReason
    }
  }
`;

const SUBMIT_GT_BUYBACK_BURN_MUTATION = gql`
  mutation SubmitGtBuybackBurn(
    $store: StringPubkey
    $group: [[String!]!]!
  ) {
    submitGtBuybackBurn(store: $store, group: $group) {
      accepted
      owner
      store
      vault
      exchange
      amount
      currentMintingPrice
      estimatedPayoutUsdcAmount
      priceTimestamp
      expiresAt
      signature
      slot
      sendError
    }
  }
`;

export type FetchGtBuybackSummaryParams = {
  store?: string;
  owner: string;
  requestedGtAmount?: string | null;
};

export async function fetchGtBuybackSummary(
  params: FetchGtBuybackSummaryParams
): Promise<GtBuybackSummary> {
  const data = await keeperGraphql<{
    gtBuybackSummary: GtBuybackSummary;
  }>(print(GT_BUYBACK_SUMMARY_QUERY), {
    store: params.store,
    owner: params.owner,
    requestedGtAmount: params.requestedGtAmount ?? null,
  });
  return data.gtBuybackSummary;
}

export async function fetchGtBuybackRequestStatus(
  signature: string
): Promise<GtBuybackRequestStatusResult | null> {
  const data = await keeperGraphql<{
    gtBuybackRequestStatus: GtBuybackRequestStatusResult | null;
  }>(print(GT_BUYBACK_REQUEST_STATUS_QUERY), { signature });
  return data.gtBuybackRequestStatus;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/**
 * Polls keeper until the burn request appears (or fails / times out).
 * Timeout is soft: returns null so the caller can still refresh UI after accept.
 */
export async function pollGtBuybackRequestStatus(
  signature: string
): Promise<GtBuybackRequestStatusResult | null> {
  for (let attempt = 0; attempt < REQUEST_STATUS_POLL_MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await sleep(REQUEST_STATUS_POLL_INTERVAL_MS);
    }
    const status = await fetchGtBuybackRequestStatus(signature);
    if (!status) continue;

    if (
      (REQUEST_STATUS_FAILURE as readonly string[]).includes(status.status)
    ) {
      throw new Error(
        status.failureReason || `Buyback request failed (${status.status})`
      );
    }
    return status;
  }
  return null;
}

export type SubmitGtBuybackBurnParams = {
  store?: string;
  /** Nested base64 signed transactions, same shape as sendTransactionGroup. */
  group: string[][];
};

export async function submitGtBuybackBurn(
  params: SubmitGtBuybackBurnParams
): Promise<GtBuybackBurnSubmitResult> {
  const data = await keeperGraphql<{
    submitGtBuybackBurn: GtBuybackBurnSubmitResult;
  }>(print(SUBMIT_GT_BUYBACK_BURN_MUTATION), {
    store: params.store,
    group: params.group,
  });
  return data.submitGtBuybackBurn;
}
