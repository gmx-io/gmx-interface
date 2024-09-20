export enum QuestionType {
  generalFeedback = "generalFeedback",
  likeMost = "likeMost",
  howContinue = "howContinue",
  areasToImprove = "areasToImprove",
  ratingUp = "ratingUp",
  issues = "issues",
  concerns = "concerns",
}

export type Answer = {
  questionType: QuestionType;
  question: string;
  answer: string;
};

export type UserFeedback = {
  account: string | undefined;
  rating: number | undefined;
  isGeneralFeedback: boolean | undefined;
  totalVolume: number;
  monthVolume: number;
  answers: {
    [questionType in QuestionType]?: Answer;
  };
};

export type Question = {
  questionType: QuestionType;
  question: string;
};

export enum MissedCoinsPlace {
  marketDropdown = "marketDropdown",
  payToken = "payToken",
}
