import { t, Trans } from "@lingui/macro";
import { useMemo } from "react";

import { USD_DECIMALS } from "config/factors";
import { TOKEN_COLOR_MAP } from "config/tokens";
import { selectMarketsInfoData, selectTokensData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getPoolUsdWithoutPnl, GlvOrMarketInfo, MarketInfo } from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { TokenData } from "domain/synthetics/tokens";

import { bigintToNumber, formatAmountHuman } from "lib/numbers";
import { getGlvOrMarketAddress, getMarketIndexName } from "../../../../domain/synthetics/markets/utils";
import { useGlvGmMarketsWithComposition } from "../hooks/useMarketGlvGmMarketsCompositions";

import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import TokenIcon from "components/TokenIcon/TokenIcon";

interface CompositionTableGmProps {
  marketInfo?: GlvOrMarketInfo;
}

interface GmTableConfig {
  type: "gm";
  data: {
    token: TokenData;
    amount: bigint;
    prefix: string;
    composition: number;
  }[];
}
interface GlvTableConfig {
  type: "glv";
  data: {
    market: MarketInfo;
    tvl: readonly [used: bigint, available: bigint];
    composition: number;
  }[];
}

export function CompositionTableGm({ marketInfo }: CompositionTableGmProps) {
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const tokensData = useSelector(selectTokensData);
  const isGlv = marketInfo && isGlvInfo(marketInfo);

  const selectGmComposition = useGlvGmMarketsWithComposition(true, marketInfo && getGlvOrMarketAddress(marketInfo));

  const [col1, col2, col3] = useMemo(() => {
    if (isGlv) {
      return [t`MARKET`, t`TVL`, t`COMP.`];
    }

    return [t`COLLATERAL`, t`AMOUNT`, t`COMP.`];
  }, [isGlv]);

  const table: GmTableConfig | GlvTableConfig | undefined = useMemo(() => {
    if (!marketInfo) {
      return undefined;
    }

    if (isGlv) {
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

    const compLong = sum > 0 ? (bigintToNumber(longPoolAmountUsd ?? 0n, USD_DECIMALS) * 100) / sum : 0;
    const compShort = sum > 0 ? (bigintToNumber(shortPoolAmountUsd ?? 0n, USD_DECIMALS) * 100) / sum : 0;

    return {
      type: "gm",
      data: [
        {
          token: longToken,
          amount: longPoolAmount,
          composition: compLong,
          prefix: "Long",
        },
        {
          token: shortToken,
          amount: shortPoolAmount,
          composition: compShort,
          prefix: "Short",
        },
      ],
    };
  }, [marketInfo, marketsInfoData, isGlv, tokensData, selectGmComposition]);

  const rows = useMemo(() => {
    if (!table) {
      return null;
    }

    if (table.type === "glv") {
      return table.data.map(({ composition, market, tvl }, index) => {
        if (composition === undefined || composition === undefined || !market?.indexToken) {
          return null;
        }

        return (
          <TableTr key={`comp-data-${market.longTokenAddress}-${index}`} hoverable={false} bordered={false}>
            <TableTd className="!py-8">
              <span className="flex flex-row items-center gap-8">
                <span
                  className="inline-block h-10 w-10 rounded-10"
                  // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                  style={{ backgroundColor: TOKEN_COLOR_MAP[market.indexToken.symbol] ?? TOKEN_COLOR_MAP.default }}
                />
                <TokenIcon symbol={market.indexToken.symbol} displaySize={24} />
                <span>{getMarketIndexName(market)}</span>
              </span>
            </TableTd>
            <TableTd className="!py-8">
              {formatAmountHuman(tvl[0], USD_DECIMALS, true, 1)}/{formatAmountHuman(tvl[1], USD_DECIMALS, true, 1)}
            </TableTd>
            <TableTd className="!py-8">{composition.toFixed(2)}%</TableTd>
          </TableTr>
        );
      });
    }

    if (table.type === "gm") {
      return table.data.map(({ amount, composition, token, prefix }, index) => {
        if (amount === undefined || composition === undefined || !token) {
          return null;
        }

        return (
          <TableTr key={`comp-data-${token.address}-${index}`} hoverable={false} bordered={false}>
            <TableTd className="!py-8">
              <span className="flex flex-row items-center gap-8">
                <span
                  className="inline-block h-10 w-10 rounded-10"
                  // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                  style={{ backgroundColor: TOKEN_COLOR_MAP[token.symbol] ?? TOKEN_COLOR_MAP.default }}
                />
                <TokenIcon symbol={token.symbol} displaySize={24} />
                <span>
                  <span className="opacity-70">{prefix}:</span> {token.symbol}
                </span>
              </span>
            </TableTd>
            <TableTd className="!py-8">{formatAmountHuman(amount, token.decimals, false, 3)}</TableTd>
            <TableTd className="!py-8">{composition.toFixed(2)}%</TableTd>
          </TableTr>
        );
      });
    }
  }, [table]);

  return (
    <table className="w-full">
      <thead>
        <TableTheadTr bordered>
          <TableTh>
            <Trans>{col1}</Trans>
          </TableTh>
          <TableTh>
            <Trans>{col2}</Trans>
          </TableTh>
          <TableTh>
            <Trans>{col3}</Trans>
          </TableTh>
        </TableTheadTr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
  );
}
