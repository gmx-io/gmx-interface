export type TwapDuration = {
  minutes: number;
  hours: number;
};

export type TwapOrderParams = {
  duration: TwapDuration;
  numberOfParts: number;
};

export type TwapPartParams = TwapOrderParams & {
  partIndex: number;
};
