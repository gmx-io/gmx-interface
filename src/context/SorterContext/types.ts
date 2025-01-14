export type SorterKey =
  | "chart-token-selector"
  | "gm-list"
  | "dashboard-markets-list"
  | "gm-token-selector"
  | "leaderboard-accounts-table"
  | "leaderboard-positions-table";

export type SorterConfig<SortField extends string | "unspecified" = "unspecified"> = {
  orderBy: SortField;
  direction: SortDirection;
  isDefault?: boolean;
};

export type SortDirection = "asc" | "desc" | "unspecified";
