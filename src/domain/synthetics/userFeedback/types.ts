export type Answer = {
  questionType: string;
  question: string;
  answer: string;
};

export type UserFeedback = {
  account: string | undefined;
  rating: number | undefined;
  isGeneralFeedback: boolean | undefined;
  totalVolume: number;
  monthVolume: number;
  answers: Answer[];
};

export type Question = {
  questionType: string;
  question: string;
};
