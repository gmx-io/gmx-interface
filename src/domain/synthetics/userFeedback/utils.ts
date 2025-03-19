import { t } from "@lingui/macro";

import { Answer, Question, QuestionType } from "./types";

export const COIN_REGEXP = /[A-za-z0-9_\\.-]/;

export function formatAnswersByQuestionType(answers: Answer[]) {
  return answers.reduce(
    (acc, answer) => {
      acc[answer.questionType] = answer;
      return acc;
    },
    {} as { [questionType in QuestionType]?: Answer }
  );
}

export function getQuestionsByRating(rating: number): Question[] {
  const questionsByRating: { minRating: number; questions: Question[] }[] = [
    {
      minRating: 9,
      questions: [
        {
          questionType: QuestionType.likeMost,
          question: t`What did you like the most about our service?`,
        },
        {
          questionType: QuestionType.howContinue,
          question: t`How can we continue to meet your expectations?`,
        },
      ],
    },
    {
      minRating: 7,
      questions: [
        {
          questionType: QuestionType.areasToImprove,
          question: t`What areas can we improve to make your experience better?`,
        },
        {
          questionType: QuestionType.ratingUp,
          question: t`What would have made your rating a 9 or 10?`,
        },
      ],
    },
    {
      minRating: 0,
      questions: [
        {
          questionType: QuestionType.issues,
          question: t`What issues did you encounter that led to your rating?`,
        },
        {
          questionType: QuestionType.concerns,
          question: t`How can we address your concerns and improve your experience?`,
        },
      ],
    },
  ];

  return questionsByRating.find((x) => rating >= x.minRating)?.questions || [];
}
