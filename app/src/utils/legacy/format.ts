import {
  BN_10,
  BN_100,
  BN_1000,
  BN_100000000,
  BN_ZERO,
  GM_DECIMALS,
  ONE_BPS,
  USD_DECIMALS,
} from '@/config/constants';
import { getGmw213Enabled, getGmw379Enabled } from '@/config/featureFlagEnable';
import { parseDecimalToBN } from './parseDecimalToBN'

const KMB_UPPER = getGmw213Enabled();
const SFX_K = KMB_UPPER ? 'K' : 'k';
const SFX_M = KMB_UPPER ? 'M' : 'm';
const SFX_B = KMB_UPPER ? 'B' : 'b';
import { TokenData, TokensRatio } from '@/selectors/token/types';
import {
  getLimitedDisplay,
  getPlusOrMinusSymbol,
  getPriceDecimals,
  getUnit,
} from '@/utils/legacy/common';
import { convertToFixedDecimal } from '@/utils/legacy/convert';
import {
  limitDecimalsWithoutHalfUp,
  limitDecimals,
  numberWithCommas,
  padDecimals,
  trimZeroDecimals,
} from '@/utils/legacy/decimals';
import { isSameTokenAddress } from '@/utils/token/isSameTokenAddress';
import { BN } from '@coral-xyz/anchor';
import { format, format as formatDateFn } from 'date-fns';

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
import calendar from 'dayjs/plugin/calendar';
import 'dayjs/locale/en';

dayjs.extend(utc);
dayjs.extend(calendar);
dayjs.locale('en');

export function formatTimestamp(timestamp: string, type?: string): string {
  if (type === 'calendar') {
    const t = dayjs.utc(timestamp).local();
    const result = t.calendar(null, {
      sameDay: '[Today at] h:mm A',
      lastDay: '[Yesterday at] h:mm A',
      lastWeek: 'dddd [at] h:mm A',
      sameElse: 'MM/DD/YYYY [at] h:mm A'
    });
    return result || `${timestamp}`;
  }
  const date = new Date(timestamp);

  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
}

export function formatTimestampNow(ts: string | number | undefined | null): string {
  if (!ts) return '';

  let date: Date;
  const num = Number(ts);

  if (!isNaN(num)) {
    date = new Date(num > 1e12 ? num : num * 1000);
  } else {
    date = new Date(ts as string);
  }

  if (isNaN(date.getTime())) {
    console.warn('Invalid date input:', ts);
    return 'Invalid Date';
  }

  return format(date, 'dd MMM yyyy, HH:mm');
}

export function formatDate(timestamp: BN): string {
  if (!timestamp) return '-';

  // Multiply by 1000 to convert from seconds to milliseconds
  const date = new Date(timestamp.toNumber() * 1000);

  return format(date, 'dd MMM yyyy, HH:mm:ss');
}

export function formatTVTime(date: Date) {
  return formatDateFn(date, 'HH:mm');
}

export function formatTVDate(date: Date) {
  return formatDateFn(date, 'dd MMM yyyy');
}

export function formatUsd(
  usd?: BN,
  opts: {
    fallbackToZero?: boolean;
    displayDecimals?: number;
    maxThreshold?: string;
    minThreshold?: string;
    showPlusForZero?: boolean;
    displayPlus?: boolean;
    signed?: boolean;
    showDollarSign?: boolean;
    showUseCommas?: boolean;
  } = {}
) {
  const displayDecimals = opts.displayDecimals ?? 2;
  const showDollarSign = opts.showDollarSign ?? true;
  const showUseCommas = opts.showUseCommas ?? true;

  if (!usd) {
    if (opts.fallbackToZero) {
      usd = BN_ZERO;
    } else {
      return undefined;
    }
  }

  const exceedingInfo = getLimitedDisplay(usd, USD_DECIMALS, opts);

  const sign = opts.signed
    ? getPlusOrMinusSymbol(usd, { showPlusForZero: opts.showPlusForZero })
    : usd.lt(BN_ZERO)
      ? '-'
      : opts.displayPlus
        ? '+'
        : '';
  const symbol = exceedingInfo.symbol ? `${exceedingInfo.symbol} ` : '';
  const displayUsd = formatAmount(
    exceedingInfo.value,
    USD_DECIMALS,
    displayDecimals,
    showUseCommas
  );
  const dollarSign = showDollarSign ? '$' : '';
  return `${symbol}${sign}${dollarSign}${displayUsd}`;
}

export function formatPriceUsd(
  usd?: BN | null,
  opts: {
    fallbackToZero?: boolean;
    displayDecimals?: number;
    isDisplayDecimals?: boolean;
    maxThreshold?: string;
    minThreshold?: string;
    minThresholdScale?: number;
    displayPlus?: boolean;
    showDollarSign?: boolean;
    useCommas?: boolean;
  } = {}
) {
  const { fallbackToZero = false } = opts;
  let displayDecimals = opts.displayDecimals ?? 5;
  const showDollarSign = opts.showDollarSign ?? true;
  const useCommas = opts.useCommas ?? true;
  const isDisplayDecimals = opts.isDisplayDecimals ?? false;

  if (usd === null) {
    return '-';
  }

  if (!usd) {
    if (fallbackToZero) {
      usd = BN_ZERO;
    } else {
      return undefined;
    }
  }

  displayDecimals = isDisplayDecimals ? displayDecimals : getPriceDecimals(usd);

  const exceedingInfo = getLimitedDisplay(usd, USD_DECIMALS, opts);

  const maybePlus = opts.displayPlus ? '+' : '';
  const sign = usd.lt(BN_ZERO) ? '-' : maybePlus;
  const symbol = exceedingInfo.symbol ? `${exceedingInfo.symbol} ` : '';
  const displayUsd = formatAmount(
    exceedingInfo.value,
    USD_DECIMALS,
    displayDecimals,
    useCommas
  );

  const dollarSign = showDollarSign ? '$' : '';
  return `${symbol}${sign}${dollarSign}${displayUsd}`;
}

export function formatDeltaUsd(
  deltaUsd?: BN | undefined,
  percentage?: number | undefined,
  opts: {
    fallbackToZero?: boolean;
    showPlusForZero?: boolean;
  } = {}
): string | undefined {
  if (!deltaUsd) {
    if (opts.fallbackToZero) {
      const sign = opts.showPlusForZero ? '+' : '';
      return `${sign}$0.00 (${sign}0.00%)`;
    }
    return undefined;
  }

  const sign = getPlusOrMinusSymbol(deltaUsd, {
    showPlusForZero: opts.showPlusForZero,
  });

  const exceedingInfo = getLimitedDisplay(deltaUsd, USD_DECIMALS);
  const percentageStr = ` (${sign}${formatPercentage(Math.abs(percentage ?? 0), 2, { fallbackToZero: true })})`;
  const deltaUsdStr = formatAmount(exceedingInfo.value, USD_DECIMALS, 2, true);
  const symbol = exceedingInfo.symbol ? `${exceedingInfo.symbol} ` : '';

  return `${symbol}${sign}$${deltaUsdStr}${percentageStr}`;
}

export function formatAmountWithoutHalfUp(
  amount: BN | undefined | null,
  tokenDecimals: number | undefined,
  displayDecimals?: number | undefined,
  useCommas?: boolean,
  trimTrailingZeros?: boolean
): string {
  if (!amount || !tokenDecimals) {
    return '...';
  }

  displayDecimals = displayDecimals ?? 5;

  const isNegative = amount.isNeg();
  const absAmount = amount.abs();
  let amountStr = convertToFixedDecimal(absAmount, tokenDecimals);
  amountStr = limitDecimalsWithoutHalfUp(amountStr, displayDecimals);

  if (displayDecimals !== 0) {
    if (trimTrailingZeros) {
      amountStr = trimZeroDecimals(amountStr);
    } else {
      amountStr = padDecimals(amountStr, displayDecimals);
    }
  }

  const formattedAmount = useCommas ? numberWithCommas(amountStr) : amountStr;
  return isNegative ? `-${formattedAmount}` : formattedAmount;
}

export function formatAmountToIntegerNumber(
  amount: BN | undefined | null,
  tokenDecimals: number | undefined
): number {
  const formattedAmount = formatAmountWithoutHalfUp(amount, tokenDecimals, 0);
  return Number(formattedAmount);
}

export function formatAmount(
  amount: BN | undefined | null,
  tokenDecimals: number | undefined,
  displayDecimals?: number | undefined,
  useCommas?: boolean,
  trimTrailingZeros?: boolean
): string {
  if (!amount || !tokenDecimals) {
    return '...';
  }

  displayDecimals = displayDecimals ?? 5;

  const isNegative = amount.isNeg();
  const absAmount = amount.abs();
  let amountStr = convertToFixedDecimal(absAmount, tokenDecimals);
  amountStr = limitDecimals(amountStr, displayDecimals);

  if (displayDecimals !== 0) {
    if (trimTrailingZeros) {
      amountStr = trimZeroDecimals(amountStr);
    } else {
      amountStr = padDecimals(amountStr, displayDecimals);
    }
  }

  const formattedAmount = useCommas ? numberWithCommas(amountStr) : amountStr;
  return isNegative ? `-${formattedAmount}` : formattedAmount;
}

export function formatAmountWithOutReg(
  amount: BN | undefined | null,
  tokenDecimals: number | undefined,
  displayDecimals?: number | undefined,
  useCommas?: boolean,
  trimTrailingZeros?: boolean
): string {
  if (!amount || !tokenDecimals) {
    return '...';
  }

  displayDecimals = displayDecimals ?? 5;

  const absAmount = amount.abs();
  let amountStr = convertToFixedDecimal(absAmount, tokenDecimals);
  amountStr = limitDecimals(amountStr, displayDecimals);

  if (displayDecimals !== 0) {
    if (trimTrailingZeros) {
      amountStr = trimZeroDecimals(amountStr);
    } else {
      amountStr = padDecimals(amountStr, displayDecimals);
    }
  }

  const formattedAmount = useCommas ? numberWithCommas(amountStr) : amountStr;
  return formattedAmount;
}

export function formatAmountWithD(
  amount: BN | undefined | null,
  tokenDecimals: number | undefined,
  displayDecimals?: number | undefined,
  useCommas?: boolean,
  trimTrailingZeros?: boolean
): string {
  if (!amount || !tokenDecimals) {
    return '...';
  }

  displayDecimals = displayDecimals ?? 5;

  const isNegative = amount.isNeg();
  const absAmount = amount.abs();
  let amountStr = convertToFixedDecimal(absAmount, tokenDecimals);
  amountStr = limitDecimals(amountStr, displayDecimals);

  if (displayDecimals !== 0) {
    if (trimTrailingZeros) {
      amountStr = trimZeroDecimals(amountStr);
    } else {
      amountStr = padDecimals(amountStr, displayDecimals);
    }
  }

  const formattedAmount = useCommas ? numberWithCommas(amountStr) : amountStr;
  return isNegative ? `-$${formattedAmount}` : '$' + formattedAmount;
}

export function formatAmountFree(
  amount: BN,
  tokenDecimals: number,
  displayDecimals?: number,
  isKeepTrailingZeros?: boolean
): string {
  if (!amount) {
    return '...';
  }

  if (!displayDecimals) {
    displayDecimals = tokenDecimals;
  }

  const keepTrailingZeros = isKeepTrailingZeros || false;

  let amountStr = convertToFixedDecimal(amount, tokenDecimals);
  amountStr = limitDecimals(amountStr, displayDecimals);
  return trimZeroDecimals(amountStr, keepTrailingZeros);
}

export function formatAmountHuman(
  amount: BN | undefined,
  tokenDecimals: number,
  showDollar = false,
  displayDecimals = 1
) {
  const n = Number(formatAmount(amount, tokenDecimals));
  const isNegative = n < 0;
  const absN = Math.abs(n);
  const sign = showDollar ? '$' : '';

  if (absN >= 1000000) {
    return `${isNegative ? '-' : ''}${sign}${(absN / 1000000).toFixed(displayDecimals)}${SFX_M}`;
  }

  if (absN >= 1000) {
    return `${isNegative ? '-' : ''}${sign}${(absN / 1000).toFixed(displayDecimals)}${SFX_K}`;
  }

  return `${isNegative ? '-' : ''}${sign}${absN.toFixed(displayDecimals)}`;
}

export function formatTokenAmount(
  amount?: BN | undefined | null,
  tokenDecimals?: number | undefined,
  symbol?: string,
  opts: {
    showAllSignificant?: boolean;
    displayDecimals?: number;
    fallbackToZero?: boolean;
    useCommas?: boolean;
    minThreshold?: string;
    maxThreshold?: string;
    displayPlus?: boolean;
    showDollarSign?: boolean;
  } = {}
): string {
  const {
    displayDecimals = 4,
    showAllSignificant = false,
    fallbackToZero = false,
    useCommas = false,
    minThreshold = '0',
    maxThreshold,
    showDollarSign
  } = opts;

  const symbolStr = symbol ? ` ${symbol === 'WGMX' ? 'GMX' : symbol}` : '';
  const isShowDollarSign = showDollarSign ?? true;

  if (!amount || !tokenDecimals) {
    if (fallbackToZero) {
      amount = BN_ZERO;
      tokenDecimals = displayDecimals;
    } else {
      return '...';
    }
  }

  let amountStr: string;

  const maybePlus = opts.displayPlus ? '+' : '';
  const sign = amount.isNeg() ? '-' : maybePlus;

  if (showAllSignificant) {
    amountStr = formatAmount(amount, tokenDecimals, tokenDecimals, false, true);
  } else {
    const exceedingInfo = getLimitedDisplay(amount, tokenDecimals, {
      maxThreshold,
      minThreshold,
    });
    const symbol = exceedingInfo.symbol ? `${exceedingInfo.symbol} ` : '';
    amountStr = `${symbol}${sign}${formatAmount(
      exceedingInfo.value,
      tokenDecimals,
      displayDecimals,
      useCommas
    )}`;
  }

  return `${amountStr}${isShowDollarSign ? symbolStr : ''}`;
}

export function formatTokenAmountWithUsd(
  tokenAmount?: BN | undefined,
  usdAmount?: BN | undefined,
  tokenSymbol?: string,
  tokenDecimals?: number,
  opts: {
    fallbackToZero?: boolean;
    displayDecimals?: number;
    displayPlus?: boolean;
  } = {}
) {
  if (!tokenAmount || !usdAmount || !tokenSymbol || !tokenDecimals) {
    if (!opts.fallbackToZero) {
      return undefined;
    }
  }

  const tokenStr = formatTokenAmount(tokenAmount, tokenDecimals, tokenSymbol, {
    ...opts,
    useCommas: true,
    displayPlus: opts.displayPlus,
  });

  const usdStr = formatUsd(usdAmount, {
    fallbackToZero: opts.fallbackToZero,
    displayPlus: opts.displayPlus,
  });

  return `${tokenStr} (${usdStr})`;
}

export function formatTokenBalance(
  balance: TokenData['balance'],
  decimals: number
) {
  return balance ? formatAmount(balance, decimals, 5, true) : '-';
}

export function formatPercentage(
  percentage?: number | undefined,
  displayDecimals?: number,
  opts: {
    fallbackToZero?: boolean;
    signed?: boolean;
    showPercent?: boolean;
  } = {}
): string | undefined {
  const { fallbackToZero = false, signed = false, showPercent = true } = opts;

  if (!percentage || !isFinite(percentage)) {
    if (fallbackToZero) {
      return `${formatAmount(BN_ZERO, USD_DECIMALS, displayDecimals ?? 2)}%`;
    }

    return '-';
  }

  const sign = signed ? getPlusOrMinusSymbol(percentage) : '';
  const absPercentage = Math.abs(percentage) * 100;
  // console.log(absPercentage)
  if (!isFinite(absPercentage)) {
    if (fallbackToZero) {
      return `${formatAmount(BN_ZERO, USD_DECIMALS, displayDecimals ?? 2)}%`;
    }
    return '-';
  }
  // console.log(new BN(Math.floor(absPercentage)))
  const floored = Math.floor(absPercentage);
  return `${sign}${formatAmount(
    new BN(Number.isSafeInteger(floored) ? floored : BigInt(floored).toString()).mul(ONE_BPS),
    USD_DECIMALS,
    displayDecimals ?? 2
  )}${showPercent ? '%' : ''}`;
}

export function formatPercentageReg(
  percentage?: number | undefined,
  displayDecimals?: number,
  opts: {
    fallbackToZero?: boolean;
    signed?: boolean;
    showPercent?: boolean;
  } = {}
): string | undefined {
  const { fallbackToZero = false, signed = false, showPercent = true } = opts;

  if (!percentage || !isFinite(percentage)) {
    if (fallbackToZero) {
      return `${formatAmount(BN_ZERO, USD_DECIMALS, displayDecimals ?? 2)}%`;
    }

    return '-';
  }

  const sign = signed ? getPlusOrMinusSymbol(percentage) : '';
  const absPercentage = Math.abs(percentage * 100);
  if (!isFinite(absPercentage)) {
    if (fallbackToZero) {
      return `${formatAmount(BN_ZERO, USD_DECIMALS, displayDecimals ?? 2)}%`;
    }
    return '-';
  }
  const negSign = percentage < 0 ? '-' : '';
  const flooredReg = Math.floor(absPercentage);
  return `${negSign}${sign}${formatAmount(
    new BN(Number.isSafeInteger(flooredReg) ? flooredReg : BigInt(flooredReg).toString()).mul(ONE_BPS),
    USD_DECIMALS,
    displayDecimals ?? 2
  )}${showPercent ? '%' : ''}`;
}

export function formatRatePercentage(
  rate?: BN | undefined,
  displayDecimals?: number | undefined,
  opts: {
    fallbackToZero?: boolean;
    signed?: boolean;
    percentages?: boolean;
  } = {}
): string | undefined {
  const { fallbackToZero = false, signed = true, percentages = true } = opts;

  if (!rate) {
    if (fallbackToZero) {
      return `${0.00}${percentages ? '%' : ''}`;
    }

    return '-';
  }

  const sign = signed ? getPlusOrMinusSymbol(rate) : '';

  return `${sign}${formatAmount(rate.abs().mul(new BN(100)), USD_DECIMALS, displayDecimals ?? 4)}${percentages ? '%' : ''}`;
}

export function formatUtilization(
  utilization: BN | undefined
): string | undefined {
  if (!utilization) return undefined;

  return formatRatePercentage(utilization, 2, { signed: false });
}

export function formatLiquidationPrice(
  liquidationPrice?: BN | undefined,
  opts: {
    displayDecimals?: number;
    showDollarSign?: boolean;
    isDisplayDecimals?: boolean;
    useCommas?: boolean;
  } = {}
): string | undefined {
  if (!liquidationPrice || liquidationPrice.lte(BN_ZERO)) {
    return 'N/A';
  }
  const showDollarSign = opts.showDollarSign ?? true;
  const useCommas = opts.useCommas ?? true;

  const priceDecimals =
    opts.displayDecimals ?? getPriceDecimals(liquidationPrice);

  const isDisplayDecimals = opts?.isDisplayDecimals ?? false;

  return formatPriceUsd(liquidationPrice, {
    ...opts,
    maxThreshold: '1000000',
    displayDecimals: priceDecimals,
    isDisplayDecimals,
    showDollarSign,
    useCommas
  });
}

// export function formatAcceptablePrice(
//   acceptablePrice?: BN | undefined,
//   opts: { displayDecimals?: number } = {}
// ): string | undefined {
//   if (
//     acceptablePrice !== undefined &&
//     (acceptablePrice.isZero() || acceptablePrice.gte(MAX_SIGNED_USD))
//   ) {
//     return 'N/A';
//   }

//   const priceDecimalPlaces = getPriceDecimals(acceptablePrice);

//   return formatUsd(acceptablePrice, {
//     ...opts,
//     displayDecimals: opts.displayDecimals ?? priceDecimalPlaces,
//   });
// }

export function formatLeverage(leverage?: BN): string | undefined {
  if (!leverage || leverage.lt(BN_ZERO)) return undefined;
  return `${formatAmount(leverage, USD_DECIMALS, 2)}x`;
}

export function formatTokensRatio(
  fromToken?: TokenData,
  toToken?: TokenData,
  ratio?: TokensRatio
) {
  if (!fromToken || !toToken || !ratio) {
    return undefined;
  }

  const [largest, smallest] = isSameTokenAddress(
    ratio.largestToken.address,
    fromToken.address
  )
    ? [fromToken, toToken]
    : [toToken, fromToken];

  return `${formatAmount(ratio.ratio, USD_DECIMALS, 4)} ${smallest.symbol} / ${largest.symbol}`;
}

export function formatPositionEstimatedLiquidationTime(
  hours?: number | undefined
) {
  if (!hours) return;
  const days = Math.floor(hours / 24);

  if (hours < 1) {
    return `< 1 hour`;
  }

  if (days > 1000) {
    return '> 1000 days';
  }
  if (hours < 24) {
    const hoursInt = Math.floor(hours);
    return `${hoursInt} ${hoursInt === 1 ? 'hour' : 'hours'}`;
  }

  return `${days} days`;
}

export function formatBalanceAmount(
  amount?: BN,
  tokenDecimals?: number,
  tokenSymbol?: string,
  showZero = false
) {
  if (!amount || !tokenDecimals) return '-';

  if (amount.isZero()) {
    if (showZero) {
      if (tokenSymbol) {
        return `0.0000 ${tokenSymbol === 'WGMX' ? 'GMX' : tokenSymbol}`;
      }
      return '0.0000';
    }
    return '-';
  }

  const absAmount = amount.abs();

  let value = '';

  if (absAmount.gte(getUnit(tokenDecimals)))
    value = formatAmount(amount, tokenDecimals, 4, true);
  else if (absAmount.gte(getUnit(tokenDecimals).div(BN_10)))
    value = formatAmount(amount, tokenDecimals, 5, true);
  else if (absAmount.gte(getUnit(tokenDecimals).div(BN_100)))
    value = formatAmount(amount, tokenDecimals, 6, true);
  else if (absAmount.gte(getUnit(tokenDecimals).div(BN_1000)))
    value = formatAmount(amount, tokenDecimals, 7, true);
  else if (absAmount.gte(getUnit(tokenDecimals).div(BN_100000000)))
    value = formatAmount(amount, tokenDecimals, 8, true);
  else value = formatAmount(amount, tokenDecimals, GM_DECIMALS, true);

  if (tokenSymbol) {
    // Non-breaking space
    return `${value} ${tokenSymbol}`;
  }

  return value;
}

export function formatUsdToKMB(
  value: BN,
  opts: {
    signed?: boolean,
    displayDecimals?: number
    showDollarSign?: boolean
    stripTrailingZeros?: boolean
  } = {}
): string {
  const factor = new BN(10).pow(new BN(2));
  const adjustedValue = value
    .mul(factor)
    .div(new BN(10).pow(new BN(USD_DECIMALS)));

  const numericValue = parseFloat(adjustedValue.toString()) / 100;

  function stripZeros(str: string): string {
    const match = str.match(/^(\d+\.?\d*)([bkm]?)$/i);
    if (!match) return str;

    const [, numPart, suffix] = match;
    const stripped = numPart.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
    return stripped + suffix;
  }

  function formatToKOrMOrB(value: number): string {
    const absValue = Math.abs(value);
    const decimals = opts.displayDecimals ?? 2;
    let result: string;

    if (absValue >= 1_000_000_000) {
      result = (absValue / 1_000_000_000).toFixed(decimals) + SFX_B;
    } else if (absValue >= 1_000_000) {
      result = (absValue / 1_000_000).toFixed(decimals) + SFX_M;
    } else if (absValue >= 1_000) {
      result = (absValue / 1_000).toFixed(decimals) + SFX_K;
    } else {
      result = absValue.toFixed(decimals);
    }

    return opts.stripTrailingZeros ? stripZeros(result) : result;
  }

  const sign = opts.signed
    ? numericValue >= 0
      ? '+'
      : '-'
    : numericValue < 0
      ? '-'
      : '';
  const formattedValue = formatToKOrMOrB(Math.abs(numericValue));

  const showDollarSign = opts.showDollarSign ?? true;
  const dollarSign = showDollarSign ? '$' : '';

  return `${sign}${dollarSign}${formattedValue}`;
}

export function formatToKMBWithoutUsd(
  value: BN,
  tokenDecimals?: number,
  opts: { signed?: boolean, displayDecimals?: number } = {}
): string {
  const factor = new BN(10).pow(new BN(2));
  const adjustedValue = value
    .mul(factor)
    .div(new BN(10).pow(new BN(tokenDecimals)));
  const numericValue = parseFloat(adjustedValue.toString()) / 100;
  function formatToKOrMOrB(value: number): string {
    const absValue = Math.abs(value);
    if (absValue >= 1_000_000_000) {
      return (absValue / 1_000_000_000).toFixed(opts.displayDecimals ?? 2) + SFX_B;
    } else if (absValue >= 1_000_000) {
      return (absValue / 1_000_000).toFixed(opts.displayDecimals ?? 2) + SFX_M;
    } else if (absValue >= 1_000) {
      return (absValue / 1_000).toFixed(opts.displayDecimals ?? 2) + SFX_K;
    } else {
      return absValue.toFixed(opts.displayDecimals ?? 2);
    }
  }
  const formattedValue = formatToKOrMOrB(Math.abs(numericValue));

  return formattedValue;
}

export function formatUsdToKMBWithoutUnit(
  value: BN,
  opts: { signed?: boolean } = {}
): string {
  const factor = new BN(10).pow(new BN(2));
  const adjustedValue = value
    .mul(factor)
    .div(new BN(10).pow(new BN(USD_DECIMALS)));

  const numericValue = parseFloat(adjustedValue.toString()) / 100;

  function formatToKOrMOrB(value: number): string {
    const absValue = Math.abs(value);
    if (absValue >= 1_000_000_000) {
      return (absValue / 1_000_000_000).toFixed(1) + SFX_B;
    } else if (absValue >= 1_000_000) {
      return (absValue / 1_000_000).toFixed(1) + SFX_M;
    } else if (absValue >= 1_000) {
      return (absValue / 1_000).toFixed(1) + SFX_K;
    } else {
      return absValue.toFixed(1);
    }
  }

  const sign = opts.signed
    ? numericValue >= 0
      ? '+'
      : '-'
    : numericValue < 0
      ? '-'
      : '';
  const formattedValue = formatToKOrMOrB(Math.abs(numericValue));

  return `${sign}${formattedValue}`;
}

export const formatNumberUsdToKMB = (value: number) => {
  const absValue = Math.abs(value);
  let result = '';
  if (absValue >= 1e9) {
    result = (absValue / 1e9).toFixed(2);
    return `${value < 0 ? '-' : ''}$${result.replace(/\.?0+$/, '')}${SFX_B}`;
  } else if (absValue >= 1e6) {
    result = (absValue / 1e6).toFixed(2);
    return `${value < 0 ? '-' : ''}$${result.replace(/\.?0+$/, '')}${SFX_M}`;
  } else if (absValue >= 1e3) {
    result = (absValue / 1e3).toFixed(2);
    return `${value < 0 ? '-' : ''}$${result.replace(/\.?0+$/, '')}${SFX_K}`;
  }
  result = absValue.toFixed(2);
  return `${value < 0 ? '-' : ''}$${result.replace(/\.?0+$/, '')}`;
};

export const formatNumberToKMB = (value: number) => {
  let result = "";
  if (value >= 1e9) {
    result = (value / 1e9).toFixed(2);
    return `${result.replace(/\.?0+$/, '')}${SFX_B}`;
  } else if (value >= 1e6) {
    result = (value / 1e6).toFixed(2);
    return `${result.replace(/\.?0+$/, '')}${SFX_M}`;
  } else if (value >= 1e3) {
    result = (value / 1e3).toFixed(2);
    return `${result.replace(/\.?0+$/, '')}${SFX_K}`;
  }
  result = value.toFixed(2);
  return result.replace(/\.?0+$/, '');
};

export function formatParseUsdToBN(usdString: string, decimals: number): BN {
  if (!usdString || usdString === '') {
    return new BN(0);
  }

  try {
    if (getGmw379Enabled()) {
      const value = parseDecimalToBN(usdString, decimals);
      return new BN(value);
    }

    const parts = usdString.split('.');
    const integerPart = parts[0] || '0';
    const decimalPart = parts[1] || '';
    const paddedDecimalPart = decimalPart
      .padEnd(decimals, '0')
      .substring(0, decimals);
    return new BN(integerPart + paddedDecimalPart);
  } catch (error) {
    console.error('Error converting USD string to BN:', error);
    return new BN(0);
  }
}

// Calculate total amount (quantity, unit price, price precision)
export function formComputeReceiveUsd(
  receiveAmount: string,
  collateralPrice: BN,
  priceDecimals: number
): string {
  const BN10 = new BN(10);

  // Split integer and fractional parts
  const [intPart, fracPart = ""] = receiveAmount.split(".");
  const amountDecimals = fracPart.length;

  // Convert to integer BN
  const receiveIntegerBN = new BN(intPart + fracPart);

  // denom = 10^(amountDecimals + priceDecimals)
  const denom = BN10.pow(new BN(amountDecimals + priceDecimals));

  // product = receiveIntegerBN * collateralPrice
  const product = receiveIntegerBN.mul(collateralPrice);

  // Multiply by 100 to keep 2 decimal places
  const numerator = product.mul(new BN(100));
  const quotient = numerator.div(denom); // In cents
  const remainder = numerator.mod(denom);

  // Rounding
  let centsBN = quotient;
  if (remainder.mul(new BN(2)).gte(denom)) {
    centsBN = centsBN.add(new BN(1));
  }

  // Convert to dollars.cents format
  const centsStr = centsBN.toString();
  const len = centsStr.length;
  const dollarsPart = len > 2 ? centsStr.slice(0, len - 2) : "0";
  const centsPart = centsStr.slice(-2).padStart(2, "0");

  return `$${dollarsPart}.${centsPart}`;
}

export function formatDivision(numeratorStr: string, denominatorStr: string, decimalPlaces = 8) {
  const numerator = new BN(numeratorStr);
  const denominator = new BN(denominatorStr);

  const integerPart = numerator.div(denominator);
  const remainder = numerator.mod(denominator);

  const scale = new BN(10).pow(new BN(decimalPlaces));
  const scaledRemainder = remainder.mul(scale).div(denominator);

  const decimalPart = scaledRemainder.toString().padStart(decimalPlaces, '0');
  return `${integerPart.toString()}.${decimalPart.toString()}`;
}

export function formatDivisionBase(numeratorStr: string, denominatorStr: string) {
  const numerator = new BN(numeratorStr);
  const denominator = new BN(denominatorStr);

  const integerPart = numerator.div(denominator);
  return `${integerPart.toString()}`;
}

export function formatCeilToDecimals(value: number, decimals: number) {
  const factor = Math.pow(10, decimals);
  return Math.ceil(value * factor) / factor;
}

export function formatUsdKMB(value: BN, decimals: number) {


}

export function formatBNToKMB(value: BN, referenceDecimals: number = 20, displayDecimals: number = 2): string {
  if (!value || value.isZero()) {
    return '0.' + '0'.repeat(displayDecimals);
  }

  const isNegative = value.isNeg();
  const absValue = value.abs();

  const unit = new BN(10).pow(new BN(referenceDecimals));
  const factor = new BN(10 ** displayDecimals);

  const thousand = unit.mul(new BN(1000));
  const million = unit.mul(new BN(1000000));
  const billion = unit.mul(new BN(1000000000));

  let result: string;

  if (absValue.gte(billion)) {
    const scaled = absValue.mul(factor).div(billion);
    const intPart = scaled.div(factor);
    const decPart = scaled.mod(factor).toString().padStart(displayDecimals, '0');
    result = `${intPart.toString()}.${decPart}${SFX_B}`;
  } else if (absValue.gte(million)) {
    const scaled = absValue.mul(factor).div(million);
    const intPart = scaled.div(factor);
    const decPart = scaled.mod(factor).toString().padStart(displayDecimals, '0');
    result = `${intPart.toString()}.${decPart}${SFX_M}`;
  } else if (absValue.gte(thousand)) {
    const scaled = absValue.mul(factor).div(thousand);
    const intPart = scaled.div(factor);
    const decPart = scaled.mod(factor).toString().padStart(displayDecimals, '0');
    result = `${intPart.toString()}.${decPart}${SFX_K}`;
  } else {
    const scaled = absValue.mul(factor).div(unit);
    const intPart = scaled.div(factor);
    const decPart = scaled.mod(factor).toString().padStart(displayDecimals, '0');
    result = `${intPart.toString()}.${decPart}`;
  }

  return isNegative ? `-${result}` : '$' + result;
}
