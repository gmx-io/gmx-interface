export type TwapDuration = {
  minutes: number;
  hours: number;
};

export type TwapOrderParams = {
  duration: TwapDuration;
  numberOfParts: number;
  /** Order metadata source (e.g. UI_FEE_SOURCE_API). Default: UI_FEE_SOURCE_UI ("00"). */
  source?: string;
};

export type TwapPartParams = TwapOrderParams & {
  partIndex: number;
};
