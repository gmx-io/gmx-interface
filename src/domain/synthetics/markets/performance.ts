export const formatPerformanceBps = (performance: number): string => {
  return Number((performance * 100).toFixed(2)) + "%";
};
