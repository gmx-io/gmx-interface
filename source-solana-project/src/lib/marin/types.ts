// Types mirroring the marin GraphQL schema (subset used by the frontend).
// Keep these in sync with the schema served at the configured endpoint.

export interface MarketSubscriptionRecord {
  pubkey: string;
  marketToken: string;
  slot: number | null;
  // Base64-encoded raw account data, decodable with the anchor `market` codec.
  // May be null if the record only carries metadata.
  data: string | null;
  isSnapshot: boolean;
  isLastSnapshot: boolean | null;
  hasLastSnapshot: boolean;
}

export interface PositionSubscriptionRecord {
  pubkey: string;
  // True for new accounts. False for updates and for deletions; deletions are
  // signalled by the field being set together with a null `data` payload.
  isInsert: boolean;
  slot: number | null;
  kind: string | null;
  owner: string | null;
  marketToken: string | null;
  collateralToken: string | null;
  // Base64-encoded raw account data, decodable with the anchor `position`
  // codec. Null indicates the position has been removed on chain.
  data: string | null;
  isSnapshot: boolean;
  isLastSnapshot: boolean | null;
  hasLastSnapshot: boolean;
}

export interface MarketsSubscriptionPayload {
  markets: MarketSubscriptionRecord;
}

export interface PositionsSubscriptionPayload {
  positions: PositionSubscriptionRecord;
}
