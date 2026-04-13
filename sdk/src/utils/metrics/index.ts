export type IMetrics = {
  pushError(error: unknown, source: string): void;
};

export const noopMetrics: IMetrics = {
  pushError() {},
};
