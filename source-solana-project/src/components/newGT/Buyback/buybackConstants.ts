/** Frontend-only until keeper exposes a season info query. */
export const BUYBACK_SEASON = {
  name: 'GT buyback Season 2',
  startedAt: '1 Aug 2026',
  status: 'Active',
} as const;

export const GT_BUYBACK_SEASON_ID = 'season-1';

export const GT_BUYBACK_SUMMARY_KEY = 'gt/buyback/summary';

/** Valid pubkey used when wallet is disconnected so summary can still load. */
export const GT_BUYBACK_SUMMARY_GUEST_OWNER =
  '11111111111111111111111111111111';

export const USDC_DECIMALS = 6;

export const REQUEST_STATUS_POLL_INTERVAL_MS = 2_000;
export const REQUEST_STATUS_POLL_MAX_ATTEMPTS = 15;

export const REQUEST_STATUS_FAILURE = [
  'expired',
  'burn_failed',
  'payout_failed',
] as const;
