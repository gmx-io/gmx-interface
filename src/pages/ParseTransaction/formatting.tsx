import { Token } from "domain/tokens";
import { formatDateTime } from "lib/dates";
import { expandDecimals, formatBalanceAmount, formatUsdPrice } from "lib/numbers";
import { NATIVE_TOKENS_MAP } from "sdk/configs/tokens";
import { LogEntryComponentProps } from "./types";
import { isGlvInfo } from "../../domain/synthetics/markets/glv";
import { zeroAddress } from "viem";
import { getMarketFullName } from "sdk/utils/markets";

type Formatter = (t: bigint, props: LogEntryComponentProps) => string;
type TokenGetter = (props: LogEntryComponentProps) => Token;

export function convertFromContractPrice(price: bigint, tokenDecimals: number) {
  return price * expandDecimals(1, tokenDecimals);
}

export const formatPrice = (t: bigint) => (t < 0n ? `-${formatUsdPrice(t * -1n)}` : formatUsdPrice(t) ?? t.toString());

export function formatPriceByField(tokenField: string | TokenGetter) {
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

    throw new Error(`Field "${tokenField}" not found in event`);
  };
}

export function formatAmountByField(tokenField: string | TokenGetter) {
  return (t: bigint, props: LogEntryComponentProps) => {
    const { entries, tokensData } = props;
    if (typeof tokenField === "function") {
      const token = tokenField(props);
      if (token) {
        return formatBalanceAmount(t, token.decimals, token.symbol, true, false) ?? t.toString();
      }
    }

    const field = entries.find((entry) => entry.item === tokenField);

    if (field) {
      const token = tokensData[field.value as string];
      if (token) {
        return formatBalanceAmount(t, token.decimals, token.symbol, true, false) ?? t.toString();
      }
    }

    throw new Error(`Field "${tokenField}" not found in event`);
  };
}

export const formatDateField = (t: bigint) => formatDateTime(Number(t)) + ` (${t})`;

export function formatByMarketLongOrShortToken(isLong: boolean) {
  return (t: bigint, { entries, tokensData, marketsInfoData, allEvents }: LogEntryComponentProps) => {
    let marketAddress = entries.find((entry) => entry.item === "market")?.value;

    if (!marketAddress) {
      const event = allEvents.find((e) => e.name === "MarketPoolValueUpdated");
      marketAddress = event?.values.find((e) => e.item === "market")?.value;
    }

    const market = marketsInfoData[marketAddress as string];

    if (market) {
      let tokenData = tokensData[isLong ? market.longTokenAddress : market.shortTokenAddress];
      if (tokenData) {
        return formatBalanceAmount(t, tokenData.decimals, tokenData.symbol, true, false);
      }
    }

    throw new Error(`Field "market" not found in event`);
  };
}

export const formatByMarketLongToken = formatByMarketLongOrShortToken(true);
export const formatByMarketShortToken = formatByMarketLongOrShortToken(false);

export function formatAmountByEvent(cfg: { [eventName: string]: string | Formatter }) {
  return (t: bigint, props: LogEntryComponentProps) => {
    const { entries, tokensData, name } = props;
    const tokenField = cfg[name] ?? cfg.default;

    if (!tokenField) {
      return typeof t === "bigint" ? t.toString() + "n" : t;
    }

    if (typeof tokenField === "function") {
      return tokenField(t, props);
    }

    const field = entries.find((entry) => entry.item === tokenField);

    if (field) {
      const token = tokensData[field.value as string];
      if (token) {
        return formatBalanceAmount(t, token.decimals, token.symbol, true, false);
      }
    }

    return t.toString();
  };
}

export const formatAmountByCollateralToken = formatAmountByField("collateralToken");
export const formatAmountByNativeToken = formatAmountByField(({ chainId, tokensData }) => {
  return tokensData[NATIVE_TOKENS_MAP[chainId].address];
});

export function getCollateralToken({ entries, tokensData }: LogEntryComponentProps) {
  const collateralToken = entries.find((entry) => entry.item === "collateralToken");

  if (collateralToken) {
    return tokensData[collateralToken.value as string];
  }

  throw new Error(`Field "collateralToken" not found in event`);
}

function getMarketOrGlvToken({ entries, marketsInfoData, marketTokensData, glvData }: LogEntryComponentProps) {
  const marketAddress = entries.find((entry) => entry.item === "market");

  if (marketAddress) {
    const marketOrGlv = marketsInfoData[marketAddress.value as string] || glvData[marketAddress.value as string];

    if (marketOrGlv) {
      const tokenAddress = isGlvInfo(marketOrGlv) ? marketOrGlv.glvTokenAddress : marketOrGlv.marketTokenAddress;
      return marketTokensData[tokenAddress];
    } else {
      throw new Error(`Market not found`);
    }
  } else {
    throw new Error(`Field "market" not found in event`);
  }
}

function getIndexToken({ entries, marketsInfoData, tokensData }: LogEntryComponentProps) {
  const marketAddress = entries.find((entry) => entry.item === "market");

  if (marketAddress) {
    const market = marketsInfoData[marketAddress.value as string];

    if (market) {
      return market.indexToken;
    }
  }

  if (marketAddress?.value === zeroAddress) {
    const nativeToken = Object.values(tokensData).find((e) => e.address === zeroAddress);
    if (nativeToken) {
      return nativeToken;
    }
  }

  throw new Error(`Field "market" not found in event`);
}

export const formatAmountByEventField = (eventName: string, field: string | TokenGetter) => {
  return (t: bigint, props: LogEntryComponentProps) => {
    const event = props.allEvents.find((e) => e.name === eventName);

    if (event) {
      const entry =
        typeof field === "function"
          ? field({ ...props, entries: event.values })
          : event.values.find((e) => e.item === field)?.value;
      const token = typeof field === "function" ? (entry as Token) : props.tokensData[entry as string];

      if (token) {
        return formatBalanceAmount(t, token.decimals, token.symbol, true, false);
      }
    }

    throw new Error(`Field "${field}" not found in event`);
  };
};

export const formatAmountByMarketTokenInDeposit = formatAmountByEventField(
  "MarketPoolValueUpdated",
  getMarketOrGlvToken
);
export const formatAmountByCollateralTokenInFeesEvent = formatAmountByEventField(
  "PositionFeesInfo",
  getCollateralToken
);

export const formatAmountByIndexToken = formatAmountByField(getIndexToken);
export const formatAmountByMarketToken = formatAmountByField(getMarketOrGlvToken);
export const formatPriceByIndexToken = formatPriceByField(getIndexToken);

export const formatPriceByToken = formatPriceByField("token");
export const formatPriceByCollateralToken = formatPriceByField("collateralToken");

export const formatAmountByFieldWithDecimalsShift = (tokenField: string | TokenGetter, shift: number) =>
  formatAmountByField((props: LogEntryComponentProps) => {
    const { entries, tokensData } = props;
    const field =
      typeof tokenField === "function" ? tokenField(props) : entries.find((entry) => entry.item === tokenField)?.value;

    if (!field) {
      throw new Error("Field not found");
    }

    const token = typeof tokenField === "function" ? (field as Token) : tokensData[field as string];

    if (token) {
      return {
        ...token,
        decimals: token.decimals + shift,
      };
    }

    throw new Error("Market not found");
  });

export function getMarketLongOrShortTokenByEventData(props: LogEntryComponentProps) {
  const { entries } = props;
  const isLong = entries.find((entry) => entry.item === "isLong")?.value as boolean;

  return getMarketLongOrShortToken(isLong)(props);
}

export function getMarketLongOrShortToken(isLong: boolean) {
  return (props: LogEntryComponentProps) => {
    const { entries, tokensData, marketsInfoData } = props;
    const marketAddress = entries.find((entry) => entry.item === "market");
    const market = marketsInfoData[marketAddress?.value as string];

    if (market) {
      let tokenData = tokensData[isLong ? market.longTokenAddress : market.shortTokenAddress];
      if (tokenData) {
        return tokenData;
      }

      throw new Error("Token not found");
    }

    throw new Error("Market not found");
  };
}

export const formatAmountByCollateralToken15Shift = formatAmountByFieldWithDecimalsShift("collateralToken", 15);
export const formatAmountByLongToken15Shift = formatAmountByFieldWithDecimalsShift(getMarketLongOrShortToken(true), 15);
export const formatAmountByShortToken15Shift = formatAmountByFieldWithDecimalsShift(
  getMarketLongOrShortToken(false),
  15
);

export const formatSwapPath = (t: string[], props: LogEntryComponentProps) => {
  const marketsInfo = props.marketsInfoData;

  if (t.length === 0) {
    return "[]";
  }

  return (
    <div className="flex flex-col gap-4">
      {t.map((marketAddress) => {
        const market = marketsInfo[marketAddress];
        return market ? (
          <div key={marketAddress}>
            {getMarketFullName(market)} ({marketAddress})
          </div>
        ) : (
          <span key={marketAddress}>{marketAddress}</span>
        );
      })}
    </div>
  );
};
