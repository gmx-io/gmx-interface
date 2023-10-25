import { differenceInDays } from "date-fns";

function getDaysConsideredInMarketsApr(date: Date) {
  const dayEstimationStarts = new Date("2023-11-01T00:00:00");
  const daysPased = differenceInDays(date, dayEstimationStarts);

  return Math.max(7, Math.min(30, daysPased));
}

let date: null | Date = null;

export const useDaysConsideredInMarketsApr = () => {
  if (!date) date = new Date();
  return getDaysConsideredInMarketsApr(date);
};
