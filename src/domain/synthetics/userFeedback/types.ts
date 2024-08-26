export type Answer = {
  questionType: string;
  question: string;
  answer: string;
};

export type NpsSurveyResult = {
  account: string;
  rating: number;
  totalVolume: number;
  monthVolume: number;
  answers: Answer[];
};

export type Question = {
  questionType: string;
  question: string;
};
