export type SorterKey =
  | "chart-token-selector-spot"
  | "chart-token-selector-perp"
  | "gm-list"
  | "dashboard-markets-list"
  | "gm-token-selector"
  | "leaderboard-accounts-table"
  | "leaderboard-positions-table"
  | "position-list"
  | "solana-referrals-referees";

export type SorterConfig<SortField extends string | "unspecified" = "unspecified"> = {
  orderBy: SortField;
  direction: SortDirection;
  isDefault?: boolean;
};

export type SortDirection = "asc" | "desc" | "unspecified";
