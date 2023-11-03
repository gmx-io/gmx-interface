import { differenceInDays } from "date-fns";

function getDaysConsideredInMarketsApr(now: Date) {
  const dayEstimationStarts = new Date(localStorage.getItem("aprStartDate") ?? "2023-11-01T00:00:00.000Z");
  const daysPassed = differenceInDays(now, dayEstimationStarts);

  return Math.max(7, Math.min(30, daysPassed));
}

let date: null | Date = null;

export const useDaysConsideredInMarketsApr = () => {
  if (!date) date = new Date();
  return getDaysConsideredInMarketsApr(date);
};
