import { gql } from '@apollo/client';
import { print } from 'graphql';
import {
  GT_SQD_GRAPHQL_ENDPOINT,
  MARIN_GRAPHQL_ENDPOINT,
} from '@/config/url';

export type GtBuybackQuotaWatermark = {
  id: string;
  network: string;
  store: string;
  seasonId: string;
  processedThroughSlot: number;
  completedWatermarkSlot: number;
  isReady: boolean;
  pendingAssociationCount: number;
  totalContributionsCount: number;
  boundaryStartSlot: number;
  boundaryEndSlot: number | null;
  isSealed: boolean;
  sealedAtSlot: number | null;
  authorityCompletedThroughSlot: number;
  authorityStallReason: string | null;
  authorityStallAtSlot: number | null;
  authorityStallSourceId: string | null;
};

export type GtBuybackSellRequestWatermark = {
  id: string;
  network: string;
  finalizedProcessedThroughSlot: number;
  attributionCompletedThroughSlot: number;
  attributionStallReason: string | null;
  attributionStallAtSlot: number | null;
  attributionStallSourceId: string | null;
};

export type GtBuybackSellQuota = {
  id: string;
  network: string;
  store: string;
  seasonId: string;
  referrerUser: string;
  cumulativeEarnedGt: string;
  cumulativeSellQuota: string;
  lastContributionSlot: number;
  updatedAtSlot: number;
  coefficientK: number;
  coefficientVersion: string;
  updatedAt: string;
};

export type GtBuybackSellQuotaSnapshot = {
  id: string;
  network: string;
  store: string;
  seasonId: string;
  referrerUser: string;
  mintSlot: number;
  cumulativeEarnedGt: string;
  cumulativeSellQuota: string;
  processedThroughSlot: number;
  updatedAt: string;
};

export type GtBuybackUserSrState = {
  id: string;
  authoritativeNonce: string;
  selledRaw: string;
  lastQuotaReferenceSlot: number | null;
  updatedAtSlot: number;
  lastAuthoritativeSr: {
    id: string;
    nonce: string;
    quotaReferenceSlot: number;
    slot: number;
    txSignature: string;
  } | null;
};

export type GtBuybackSellContext = {
  quotaWatermark: GtBuybackQuotaWatermark | null;
  sellRequestWatermark: GtBuybackSellRequestWatermark | null;
  sellQuota: GtBuybackSellQuota | null;
  sellQuotaSnapshot: GtBuybackSellQuotaSnapshot | null;
  userSrState: GtBuybackUserSrState | null;
  referenceSlot: number;
};

export type PrepareGtBuybackSellRequestResult = {
  transaction: string;
  lastValidBlockHeight: string;
  blockhash: string;
  keeper: string;
  store: string;
  seasonId: string;
  nonce: string;
  amountRaw: string;
  quotaReferenceSlot: string;
};

export type SubmitGtBuybackSellRequestResult = {
  signature: string;
  slot: string | null;
  error: string | null;
};

type GraphQlResponse<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

const CURRENT_SELL_CONTEXT_QUERY = gql`
  query CurrentSellContext(
    $quotaWatermarkId: String!
    $sellRequestWatermarkId: String!
    $network: String!
    $store: String!
    $seasonId: String!
    $owner: String!
    $referrerUser: String!
    $referenceSlot: Int!
  ) {
    quotaWatermarkById(id: $quotaWatermarkId) {
      id
      network
      store
      seasonId
      processedThroughSlot
      completedWatermarkSlot
      isReady
      pendingAssociationCount
      totalContributionsCount
      boundaryStartSlot
      boundaryEndSlot
      isSealed
      sealedAtSlot
      authorityCompletedThroughSlot
      authorityStallReason
      authorityStallAtSlot
      authorityStallSourceId
    }
    sellRequestWatermarkById(id: $sellRequestWatermarkId) {
      id
      network
      finalizedProcessedThroughSlot
      attributionCompletedThroughSlot
      attributionStallReason
      attributionStallAtSlot
      attributionStallSourceId
    }
    sellQuota(
      where: {
        network_eq: $network
        store_eq: $store
        seasonId_eq: $seasonId
        referrerUser_eq: $referrerUser
      }
      limit: 1
    ) {
      id
      network
      store
      seasonId
      referrerUser
      cumulativeEarnedGt
      cumulativeSellQuota
      lastContributionSlot
      updatedAtSlot
      coefficientK
      coefficientVersion
      updatedAt
    }
    sellQuotaSnapshots(
      where: {
        network_eq: $network
        store_eq: $store
        seasonId_eq: $seasonId
        referrerUser_eq: $referrerUser
        mintSlot_lte: $referenceSlot
      }
      orderBy: [mintSlot_DESC]
      limit: 1
    ) {
      id
      network
      store
      seasonId
      referrerUser
      mintSlot
      cumulativeEarnedGt
      cumulativeSellQuota
      processedThroughSlot
      updatedAt
    }
    userSrStates(
      where: {
        network_eq: $network
        store_eq: $store
        seasonId_eq: $seasonId
        owner_eq: $owner
      }
      limit: 1
    ) {
      id
      authoritativeNonce
      selledRaw
      lastQuotaReferenceSlot
      updatedAtSlot
      lastAuthoritativeSr {
        id
        nonce
        quotaReferenceSlot
        slot
        txSignature
      }
    }
  }
`;

const PREPARE_GT_BUYBACK_SELL_REQUEST_MUTATION = gql`
  mutation PrepareGtBuybackSellRequest(
    $input: PrepareGtBuybackSellRequestInput!
  ) {
    prepareGtBuybackSellRequest(input: $input) {
      transaction
      lastValidBlockHeight
      blockhash
      keeper
      store
      seasonId
      nonce
      amountRaw
      quotaReferenceSlot
    }
  }
`;

const SUBMIT_GT_BUYBACK_SELL_REQUEST_MUTATION = gql`
  mutation SubmitGtBuybackSellRequest(
    $input: SubmitGtBuybackSellRequestInput!
  ) {
    submitGtBuybackSellRequest(input: $input) {
      signature
      slot
      error
    }
  }
`;

async function gtBuybackSqdGraphql<T>(
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  if (!GT_SQD_GRAPHQL_ENDPOINT) {
    throw new Error('VITE_GT_SQD_GRAPHQL_ENDPOINT is not configured');
  }

  const response = await fetch(GT_SQD_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) {
    throw new Error(`GT SQD GraphQL HTTP ${response.status}`);
  }

  const json = (await response.json()) as GraphQlResponse<T>;
  if (json.errors?.length) {
    throw new Error(
      json.errors.map((error) => error.message ?? 'Unknown GraphQL error').join('; ')
    );
  }
  if (!json.data) {
    throw new Error('GT SQD GraphQL returned empty data');
  }
  return json.data;
}

async function keeperGraphql<T>(
  query: string,
  variables: Record<string, unknown>
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
    throw new Error(`Keeper GraphQL HTTP ${response.status}`);
  }
  const json = (await response.json()) as GraphQlResponse<T>;
  if (json.errors?.length) {
    throw new Error(
      json.errors.map((error) => error.message ?? 'Unknown Keeper error').join('; ')
    );
  }
  if (!json.data) {
    throw new Error('Keeper GraphQL returned empty data');
  }
  return json.data;
}

type CurrentSellContextResponse = {
  quotaWatermarkById: GtBuybackQuotaWatermark | null;
  sellRequestWatermarkById: GtBuybackSellRequestWatermark | null;
  sellQuota: GtBuybackSellQuota[];
  sellQuotaSnapshots: GtBuybackSellQuotaSnapshot[];
  userSrStates: GtBuybackUserSrState[];
};

type CurrentSellContextParams = {
  quotaWatermarkId: string;
  sellRequestWatermarkId: string;
  network: string;
  store: string;
  seasonId: string;
  owner: string;
  referrerUser: string;
  referenceSlot: number;
};

export async function fetchGtBuybackSellContext(
  params: CurrentSellContextParams
): Promise<GtBuybackSellContext> {
  const data = await gtBuybackSqdGraphql<CurrentSellContextResponse>(
    print(CURRENT_SELL_CONTEXT_QUERY),
    params
  );

  return {
    quotaWatermark: data.quotaWatermarkById,
    sellRequestWatermark: data.sellRequestWatermarkById,
    sellQuota: data.sellQuota[0] ?? null,
    sellQuotaSnapshot: data.sellQuotaSnapshots[0] ?? null,
    userSrState: data.userSrStates[0] ?? null,
    referenceSlot: params.referenceSlot,
  };
}

export type PrepareGtBuybackSellRequestParams = {
  owner: string;
  amountRaw: string;
  nonce: string;
  quotaReferenceSlot: string;
  store: string;
};

export async function prepareGtBuybackSellRequest(
  params: PrepareGtBuybackSellRequestParams
): Promise<PrepareGtBuybackSellRequestResult> {
  const data = await keeperGraphql<{
    prepareGtBuybackSellRequest: PrepareGtBuybackSellRequestResult;
  }>(print(PREPARE_GT_BUYBACK_SELL_REQUEST_MUTATION), { input: params });
  return data.prepareGtBuybackSellRequest;
}

export async function submitGtBuybackSellRequest(
  params: { transaction: string; store: string }
): Promise<SubmitGtBuybackSellRequestResult> {
  const data = await keeperGraphql<{
    submitGtBuybackSellRequest: SubmitGtBuybackSellRequestResult;
  }>(print(SUBMIT_GT_BUYBACK_SELL_REQUEST_MUTATION), { input: params });
  return data.submitGtBuybackSellRequest;
}
