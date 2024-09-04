import { t, Trans } from "@lingui/macro";
import { useMemo } from "react";

import { bigintToNumber, formatAmountHuman } from "lib/numbers";

import TokenIcon from "components/TokenIcon/TokenIcon";
import { TOKEN_COLOR_MAP } from "config/tokens";
import { selectMarketsInfoData, selectTokensData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getPoolUsdWithoutPnl, MarketInfo } from "domain/synthetics/markets";
import { isGlv } from "domain/synthetics/markets/glv";
import { TokenData } from "domain/synthetics/tokens";
import { GlvMarketInfo } from "domain/synthetics/markets/useGlvMarkets";

import { getMarketIndexName } from "../../../../domain/synthetics/markets/utils";
import { ExchangeTd, ExchangeTh, ExchangeTheadTr, ExchangeTr } from "../../OrderList/ExchangeTable";
import { useGlvGmMarketsWithComposition } from "../hooks/useMarketGlvGmMarketsCompositions";
import { USD_DECIMALS } from "config/factors";

interface CompositionTableGmProps {
  marketInfo?: MarketInfo | GlvMarketInfo;
}

interface GmTableConfig {
  type: "gm";
  data: {
    token: TokenData;
    amount: bigint;
    prefix: string;
    comp: number;
  }[];
}
interface GlvTableConfig {
  type: "glv";
  data: {
    pool: MarketInfo;
    tvl: readonly [used: bigint, available: bigint];
    comp: number;
  }[];
}

export function CompositionTableGm({ marketInfo }: CompositionTableGmProps) {
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const tokensData = useSelector(selectTokensData);
  const isGlvMarket = marketInfo && isGlv(marketInfo);

  const selectGmComposition = useGlvGmMarketsWithComposition(true, marketInfo?.marketTokenAddress);

  const [col1, col2, col3] = useMemo(() => {
    if (isGlvMarket) {
      return [t`POOL`, t`TVL`, t`COMP.`];
    }

    return [t`COLLATERAL`, t`AMOUNT`, t`COMP.`];
  }, [isGlvMarket]);

  const table: GmTableConfig | GlvTableConfig | undefined = useMemo(() => {
    if (!marketInfo) {
      return undefined;
    }

    if (isGlvMarket) {
      if (!marketsInfoData || !tokensData) {
        return undefined;
      }

      return {
        type: "glv",
        data: selectGmComposition,
      };
    }

    const { longToken, shortToken, longPoolAmount, shortPoolAmount } = marketInfo;
    const longPoolAmountUsd = marketInfo ? getPoolUsdWithoutPnl(marketInfo, true, "midPrice") : undefined;
    const shortPoolAmountUsd = marketInfo ? getPoolUsdWithoutPnl(marketInfo, false, "midPrice") : undefined;

    const sum = bigintToNumber((longPoolAmountUsd ?? 0n) + (shortPoolAmountUsd ?? 0n), USD_DECIMALS);

    return {
      type: "gm",
      data: [
        {
          token: longToken,
          amount: longPoolAmount,
          comp: longPoolAmountUsd !== undefined ? (bigintToNumber(longPoolAmountUsd, USD_DECIMALS) * 100) / sum : 0,
          prefix: "Long",
        },
        {
          token: shortToken,
          amount: shortPoolAmount,
          comp: shortPoolAmountUsd !== undefined ? (bigintToNumber(shortPoolAmountUsd, USD_DECIMALS) * 100) / sum : 0,
          prefix: "Short",
        },
      ],
    };
  }, [marketInfo, marketsInfoData, isGlvMarket, tokensData, selectGmComposition]);

  const rows = useMemo(() => {
    if (!table) {
      return null;
    }

    if (table.type === "glv") {
      return table.data.map(({ comp, pool, tvl }, index) => {
        if (comp === undefined || comp === undefined || !pool) {
          return null;
        }

        return (
          <ExchangeTr key={`comp-data-${pool.longTokenAddress}-${index}`} hoverable={false} bordered={false}>
            <ExchangeTd className="py-6" padding="none">
              <span className="flex flex-row items-center gap-8">
                <span
                  className="inline-block h-10 w-10 rounded-10"
                  // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                  style={{ backgroundColor: TOKEN_COLOR_MAP[pool.indexToken.symbol] ?? TOKEN_COLOR_MAP.default }}
                />
                <TokenIcon symbol={pool.indexToken.symbol} displaySize={24} />
                <span>{getMarketIndexName({ indexToken: pool.indexToken, isSpotOnly: false })}</span>
              </span>
            </ExchangeTd>
            <ExchangeTd className="py-6" padding="none">
              {formatAmountHuman(tvl[0], USD_DECIMALS, true, 1)}/{formatAmountHuman(tvl[1], USD_DECIMALS, true, 1)}
            </ExchangeTd>
            <ExchangeTd className="py-6" padding="none">
              {comp.toFixed(2)}%
            </ExchangeTd>
          </ExchangeTr>
        );
      });
    }

    if (table.type === "gm") {
      return table.data.map(({ amount, comp, token, prefix }, index) => {
        if (amount === undefined || comp === undefined || !token) {
          return null;
        }

        return (
          <ExchangeTr key={`comp-data-${token.address}-${index}`} hoverable={false} bordered={false}>
            <ExchangeTd className="py-6" padding="none">
              <span className="flex flex-row items-center gap-8">
                <span
                  className="inline-block h-10 w-10 rounded-10"
                  // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                  style={{ backgroundColor: TOKEN_COLOR_MAP[token.symbol] ?? TOKEN_COLOR_MAP.default }}
                />
                <TokenIcon symbol={token.symbol} displaySize={24} />
                <span>
                  {prefix}: {token.symbol}
                </span>
              </span>
            </ExchangeTd>
            <ExchangeTd className="py-6" padding="none">
              {formatAmountHuman(amount, token.decimals, false, 3)}
            </ExchangeTd>
            <ExchangeTd className="py-6" padding="none">
              {comp.toFixed(2)}%
            </ExchangeTd>
          </ExchangeTr>
        );
      });
    }
  }, [table]);

  return (
    <table className="w-[100%]">
      <thead>
        <ExchangeTheadTr bordered={false}>
          <ExchangeTh padding="vertical">
            <Trans>{col1}</Trans>
          </ExchangeTh>
          <ExchangeTh padding="vertical">
            <Trans>{col2}</Trans>
          </ExchangeTh>
          <ExchangeTh padding="vertical">
            <Trans>{col3}</Trans>
          </ExchangeTh>
        </ExchangeTheadTr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
  );
}
