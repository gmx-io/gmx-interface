import { TokenData } from "domain/tokens";
import { formatDateTime } from "lib/dates";
import { expandDecimals, formatTokenAmount, formatUsdPrice } from "lib/numbers";
import { NATIVE_TOKENS_MAP } from "sdk/configs/tokens";
import { LogEntryComponentProps } from "./types";

export function convertFromContractPrice(price: bigint, tokenDecimals: number) {
  return price * expandDecimals(1, tokenDecimals);
}

export function formatPriceByField(tokenField: string | ((props: LogEntryComponentProps) => TokenData)) {
  return (t: bigint, props: LogEntryComponentProps) => {
    const { entries, tokensData } = props;
    if (typeof tokenField === "function") {
      const token = tokenField(props);
      if (token) {
        return formatUsdPrice(convertFromContractPrice(t, token.decimals));
      }
    }

    const field = entries.find((entry) => entry.item === tokenField);

    if (field) {
      const token = tokensData[field.value as string];
      if (token) {
        return formatUsdPrice(convertFromContractPrice(t, token.decimals));
      }
    }

    return t.toString();
  };
}

export function formatAmountByField(
  tokenField: string | ((props: LogEntryComponentProps) => TokenData),
  { displayDecimals = 2 }: { displayDecimals?: number } = {}
) {
  return (t: bigint, props: LogEntryComponentProps) => {
    const { entries, tokensData } = props;
    if (typeof tokenField === "function") {
      const token = tokenField(props);
      if (token) {
        return formatTokenAmount(t, token.decimals, token.symbol, {
          displayDecimals,
        });
      }
    }

    const field = entries.find((entry) => entry.item === tokenField);

    if (field) {
      const token = tokensData[field.value as string];
      if (token) {
        return formatTokenAmount(t, token.decimals, token.symbol, {
          displayDecimals,
        });
      }
    }

    return t.toString();
  };
}

export const formatDateField = (t: bigint) => formatDateTime(Number(t)) + ` (${t})`;

export function formatByMarketLongOrShortToken(isLong: boolean) {
  return (t: bigint, { entries, tokensData, marketsInfoData }: LogEntryComponentProps) => {
    const marketAddress = entries.find((entry) => entry.item === "market");
    const market = marketsInfoData[marketAddress?.value as string];

    if (market) {
      let tokenData = tokensData[isLong ? market.longTokenAddress : market.shortTokenAddress];
      if (tokenData) {
        return formatTokenAmount(t, tokenData.decimals) + ` ${tokenData.symbol}`;
      }
    }

    return t.toString();
  };
}

export function formatAmountByEvent(cfg: { [eventName: string]: string }) {
  return (t: bigint, { entries, tokensData, name }: LogEntryComponentProps) => {
    const tokenField = cfg[name];

    if (!tokenField) {
      return typeof t === "bigint" ? t.toString() + "n" : t;
    }

    const field = entries.find((entry) => entry.item === tokenField);

    if (field) {
      const token = tokensData[field.value as string];
      if (token) {
        return formatTokenAmount(t, token.decimals, token.symbol);
      }
    }

    return t.toString();
  };
}

export const formatAmountByCollateralToken = formatAmountByField("collateralToken");
export const formatAmountByNativeToken = formatAmountByField(
  ({ chainId, tokensData }) => {
    return tokensData[NATIVE_TOKENS_MAP[chainId].address];
  },
  {
    displayDecimals: 8,
  }
);

export const formatPriceByIndexToken = formatPriceByField(({ entries, marketsInfoData }) => {
  const marketAddress = entries.find((entry) => entry.item === "market");

  if (marketAddress) {
    const market = marketsInfoData[marketAddress.value as string];

    if (market) {
      return market.indexToken;
    }
  }

  throw new Error("Market not found");
});

export const formatPriceByToken = formatPriceByField("token");
export const formatPriceByCollateralToken = formatPriceByField("collateralToken");
