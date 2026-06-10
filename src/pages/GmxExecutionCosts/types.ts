export type GmxExecutionCostRow = {
  marketName: string;
  orderKey: string;
  side: "long" | "short";
  phase: "increase" | "decrease";
  timestamp: number;
  delaySeconds: number | null;
  transactionHash: string;
  sizeUsd: number;
  oracleSpreadBps: number | null;
  positionFeeBps: number;
  netImpactCostBps: number;
  swapCostBps: number;
  protocolCostBps: number | null;
  holdingFeeBps: number;
};

export type GmxExecutionCostSummaryRow = {
  group: string;
  count: number;
  volumeUsd: number;
  medianSizeUsd: number | null;
  medianDelaySeconds: number | null;
  p75DelaySeconds: number | null;
  medianOracleSpreadBps: number | null;
  medianPositionFeeBps: number | null;
  medianNetImpactCostBps: number | null;
  medianSwapCostBps: number | null;
  p25ProtocolCostBps: number | null;
  medianProtocolCostBps: number | null;
  p75ProtocolCostBps: number | null;
  p90ProtocolCostBps: number | null;
};

export type GmxExecutionCostDataset = {
  id: string;
  label: string;
  summary: {
    generatedAt: string;
    chain: string;
    chainId: number;
    from: number;
    to: number;
    fromIso: string;
    toIso: string;
    indexSymbol: string;
    executions: number;
    minSizeUsd: number;
    summary: GmxExecutionCostSummaryRow[];
  };
  rows: GmxExecutionCostRow[];
};
