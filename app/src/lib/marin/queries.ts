// GraphQL subscription documents for the marin backend.
//
// Each subscription is a change-data-capture stream. When `withSnapshot` is
// true the server replays current state first (each record tagged
// `isSnapshot: true`, the final replay record additionally carries
// `isLastSnapshot: true`). Live updates follow with `isSnapshot: false`.

export const MARIN_MARKETS_SUBSCRIPTION = /* GraphQL */ `
  subscription MarinMarkets($store: StringPubkey, $withSnapshot: Boolean) {
    markets(store: $store, withSnapshot: $withSnapshot) {
      pubkey
      marketToken
      slot
      data
      isSnapshot
      isLastSnapshot
      hasLastSnapshot
    }
  }
`;

export const MARIN_POSITIONS_SUBSCRIPTION = /* GraphQL */ `
  subscription MarinPositions(
    $owner: StringPubkey!
    $store: StringPubkey
    $withSnapshot: Boolean
  ) {
    positions(owner: $owner, store: $store, withSnapshot: $withSnapshot) {
      pubkey
      isInsert
      slot
      kind
      owner
      marketToken
      collateralToken
      data
      isSnapshot
      isLastSnapshot
      hasLastSnapshot
    }
  }
`;
