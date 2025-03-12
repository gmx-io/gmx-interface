export type ExchangeRouterCreateOrderParams = {
  addresses: {
    receiver: string;
    cancellationReceiver: string;
    callbackContract: string;
    uiFeeReceiver: string;
    market: string;
    initialCollateralToken: string;
    swapPath: string[];
  };
  numbers: {
    sizeDeltaUsd: bigint;
    initialCollateralDeltaAmount: bigint;
    triggerPrice: bigint;
    acceptablePrice: bigint;
    executionFee: bigint;
    callbackGasLimit: bigint;
    minOutputAmount: bigint;
    validFromTime: bigint;
  };
  orderType: number;
  decreasePositionSwapType: number;
  isLong: boolean;
  shouldUnwrapNativeToken: boolean;
  autoCancel: boolean;
  referralCode: string;
};
