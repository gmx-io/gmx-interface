export type TwapDuration = {
  minutes: number;
  hours: number;
};

export type TwapOrderParams = {
  duration: TwapDuration;
  numberOfParts: number;
  /** Source byte for uiFeeReceiver (e.g. UI_FEE_SOURCE_API). Default: UI_FEE_SOURCE_UI ("00"). */
  source?: string;
};

export type TwapPartParams = TwapOrderParams & {
  partIndex: number;
};
