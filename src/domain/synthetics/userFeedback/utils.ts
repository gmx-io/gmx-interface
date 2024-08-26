import { t } from "@lingui/macro";
import { Question } from "./types";

export function getQuestionsByRating(rating: number): Question[] {
  const questionsByRating: { [minRating: number]: Question[] } = {
    0: [
      {
        questionType: "issues",
        question: t`What issues did you encounter that led to your rating?`,
      },
      {
        questionType: "concerns",
        question: t`How can we address your concerns and improve your experience?`,
      },
    ],
    7: [
      {
        questionType: "areasToImprove",
        question: t`What areas can we improve to make your experience better?`,
      },
      {
        questionType: "ratingUp",
        question: t`What would have made your rating a 9 or 10?`,
      },
    ],
    9: [
      {
        questionType: "likeMost",
        question: t`What did you like the most about our service?`,
      },
      {
        questionType: "howContinue",
        question: t`How can we continue to meet your expectations?`,
      },
    ],
  };

  return Object.entries(questionsByRating).find(([minRating]) => rating >= Number(minRating))?.[1] || [];
}
