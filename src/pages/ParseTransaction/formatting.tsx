import { zeroAddress } from "viem";

import { Token } from "domain/tokens";
import { formatDateTime } from "lib/dates";
import { expandDecimals, formatBalanceAmount, formatUsdPrice } from "lib/numbers";
import { getByKey } from "lib/objects";
import { NATIVE_TOKENS_MAP } from "sdk/configs/tokens";
import { getMarketFullName } from "sdk/utils/markets";

import { LogEntryComponentProps } from "./types";
import { isGlvInfo } from "../../domain/synthetics/markets/glv";

type Formatter = (t: bigint, props: LogEntryComponentProps) => string;
type TokenGetter = (props: LogEntryComponentProps) => Token;

const ROLE_KEY_MAP: Record<string, string | undefined> = {
  "0x56908b85b56869d7c69cd020749874f238259af9646ca930287866cdd660b7d9": "ROLE_ADMIN",
  "0xf49b0c86b385620e25b0985905d1a112a5f1bc1d51a7a292a8cdf112b3a7c47c": "TIMELOCK_ADMIN",
  "0xe068a8d811c3c8290a8be34607cfa3184b26ffb8dea4dde7a451adfba9fa173a": "TIMELOCK_MULTISIG",
  "0x901fb3de937a1dcb6ecaf26886fda47a088e74f36232a0673eade97079dc225b": "CONFIG_KEEPER",
  "0xb49beded4d572a2d32002662fc5c735817329f4337b3a488aab0b5e835c01ba7": "LIMITED_CONFIG_KEEPER",
  "0x97adf037b2472f4a6a9825eff7d2dd45e37f2dc308df2a260d6a72af4189a65b": "CONTROLLER",
  "0x16a157db08319d4eaf6b157a71f5d2e18c6500cab8a25bee0b4f9c753cb13690": "GOV_TOKEN_CONTROLLER",
  "0xc82e6cc76072f8edb32d42796e58e13ab6e145524eb6b36c073be82f20d410f3": "ROUTER_PLUGIN",
  "0xd66692c70b60cf1337e643d6a6473f6865d8c03f3c26b460df3d19b504fb46ae": "MARKET_KEEPER",
  "0xe0ff4cc0c6ecffab6db3f63ea62dd53f8091919ac57669f1bb3d9828278081d8": "FEE_KEEPER",
  "0xc23a98a1bf683201c11eeeb8344052ad3bc603c8ddcad06093edc1e8dafa96a2": "FEE_DISTRIBUTION_KEEPER",
  "0x40a07f8f0fc57fcf18b093d96362a8e661eaac7b7e6edbf66f242111f83a6794": "ORDER_KEEPER",
  "0xcb6c7bc0d25d73c91008af44527b80c56dee4db8965845d926a25659a4a8bc07": "FROZEN_ORDER_KEEPER",
  "0x2700e36dc4e6a0daa977bffd4368adbd48f8058da74152919f91f58eddb42103": "PRICING_KEEPER",
  "0x556c788ffc0574ec93966d808c170833d96489c9c58f5bcb3dadf711ba28720e": "LIQUIDATION_KEEPER",
  "0xb37d64edaeaf5e634c13682dbd813f5a12fec9eb4f74433a089e7a3c3289af91": "ADL_KEEPER",
  "0xfa89e7b5ea0a346d73c71d7d6a3512b9f2ea2c2e6c5fb8211ec351d35deef0f4": "CONTRIBUTOR_KEEPER",
  "0xcdf6da7ad30d8b9afea66fb1cb11b1b7d0b50e9b30b69561a3ca52c39251360c": "CONTRIBUTOR_DISTRIBUTOR",
};

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
      const token = getByKey(tokensData, field.value as string);

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
      const token = getByKey(tokensData, field.value as string);
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

    const market = getByKey(marketsInfoData, marketAddress as string);

    if (market) {
      let tokenData = getByKey(tokensData, isLong ? market.longTokenAddress : market.shortTokenAddress);
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
      const token = getByKey(tokensData, field.value as string);
      if (token) {
        return formatBalanceAmount(t, token.decimals, token.symbol, true, false);
      }
    }

    return t.toString();
  };
}

export const formatAmountByCollateralToken = formatAmountByField("collateralToken");
export const formatAmountByNativeToken = formatAmountByField(({ chainId, tokensData }) => {
  if (!tokensData) {
    throw new Error(`Tokens data not found`);
  }

  return tokensData[NATIVE_TOKENS_MAP[chainId].address];
});

export function getCollateralToken({ entries, tokensData }: LogEntryComponentProps) {
  const collateralToken = entries.find((entry) => entry.item === "collateralToken");

  if (collateralToken) {
    const token = getByKey(tokensData, collateralToken.value as string);

    if (!token) {
      throw new Error(`Collateral token not found in tokensData`);
    }

    return token;
  }

  throw new Error(`Field "collateralToken" not found in event`);
}

function getMarketOrGlvToken({ entries, marketsInfoData, marketTokensData, glvData }: LogEntryComponentProps) {
  const marketAddress = entries.find((entry) => entry.item === "market");

  if (marketAddress) {
    const marketOrGlv =
      getByKey(marketsInfoData, marketAddress.value as string) || getByKey(glvData, marketAddress.value as string);

    if (marketOrGlv) {
      const tokenAddress = isGlvInfo(marketOrGlv) ? marketOrGlv.glvTokenAddress : marketOrGlv.marketTokenAddress;
      const marketToken = getByKey(marketTokensData, tokenAddress);

      if (!marketToken) {
        throw new Error(`Market token not found in marketTokensData`);
      }

      return marketToken;
    }

    throw new Error(`Market or GLV token not found in marketsInfoData or glvData`);
  } else {
    throw new Error(`Field "market" not found in event`);
  }
}

function getIndexToken({ entries, marketsInfoData, tokensData }: LogEntryComponentProps) {
  const marketAddress = entries.find((entry) => entry.item === "market");

  if (marketAddress) {
    const market = getByKey(marketsInfoData, marketAddress.value as string);

    if (market) {
      return market.indexToken;
    }
  }

  if (marketAddress?.value === zeroAddress) {
    const nativeToken = Object.values(tokensData ?? {}).find((e) => e.address === zeroAddress);
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
      const token = typeof field === "function" ? (entry as Token) : getByKey(props.tokensData, entry as string);

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

    const token = typeof tokenField === "function" ? (field as Token) : getByKey(tokensData, field as string);

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
    const market = getByKey(marketsInfoData, marketAddress?.value as string);

    if (market) {
      let tokenData = getByKey(tokensData, isLong ? market.longTokenAddress : market.shortTokenAddress);
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
        const market = getByKey(marketsInfo, marketAddress);
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

export const formatRoleKey = (key: string) => {
  return ROLE_KEY_MAP[key] ?? key;
};
