export type UsdgPoolBoostApr = {
  marketAddress: string;
  boostApr: number;
  lastRoundTimestamp: number;
};

export type UsdgGlvBoostApr = {
  glvAddress: string;
  boostApr: number;
  gmRate: number;
  premium: number | null;
  lastRoundTimestamp: number;
};

export type UsdgBoostAprResponse =
  | { status: "not_started" }
  | { status: "active"; pools: UsdgPoolBoostApr[]; glv: UsdgGlvBoostApr | null };
