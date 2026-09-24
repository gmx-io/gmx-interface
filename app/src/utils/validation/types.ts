export type ValidationTooltipName = 'maxLeverage';

export type ValidationResult =
  | [errorMessage: undefined]
  | [errorMessage: string]
  | [
      errorMessage: string,
      tooltipName: 'maxLeverage' | 'liqPrice > markPrice' | 'noSwapPath',
    ];
