export const GMSOL_LOOKUP_TABLE_ADDRESSES: readonly string[] = [
  "GtCrmXDriRQTtzeFqrJkiVxrjeUoRGkhLVH3rcEySb4o",
  "TackgvLbopMf7HwUdDEvJZvMCJufJo1nHTaYP6TGJdM",
];

// TODO(FESOL-71): register each reviewed GMX-owned copy and its independently verified authority here.
// An empty map deliberately leaves the provisional third-party mutable tables untrusted.
export const GMSOL_LOOKUP_TABLE_AUTHORITIES: Readonly<Record<string, string | undefined>> = {};
