export const GMSOL_LOOKUP_TABLE_ADDRESSES: readonly string[] = [
  "GtCrmXDriRQTtzeFqrJkiVxrjeUoRGkhLVH3rcEySb4o",
  "TackgvLbopMf7HwUdDEvJZvMCJufJo1nHTaYP6TGJdM",
];

// The configured tables are frozen; a table with an authority fails closed unless that authority is registered here.
export const GMSOL_LOOKUP_TABLE_AUTHORITIES: Readonly<Record<string, string | undefined>> = {};
