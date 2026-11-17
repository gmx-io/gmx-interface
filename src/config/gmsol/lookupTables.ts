// Provisional GMTrade mainnet tables. Both retained an authority when checked on 2026-10-20.
export const GMSOL_LOOKUP_TABLE_ADDRESSES: readonly string[] = [
  "CoMLGFDWf5soeQ6vtzL6yXeARtwNhTV41cVsrTos31wg",
  "CVHqcEnqZv2dr9PFRiJHJtWW3BPXr6WFZbixzsxmx9eG",
];

// TODO(FESOL-71): register each reviewed GMX-owned copy and its independently verified authority here.
// An empty map deliberately leaves the provisional third-party mutable tables untrusted.
export const GMSOL_LOOKUP_TABLE_AUTHORITIES: Readonly<Record<string, string | undefined>> = {};
