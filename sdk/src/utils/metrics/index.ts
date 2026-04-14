export type IMetrics = {
  pushError(error: unknown, source: string): void;
};

export const noopMetrics: IMetrics = {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  pushError() {},
};
