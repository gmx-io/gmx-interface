import { useState, useCallback, useMemo } from "react";
import { BigNumber } from "ethers";
import { t } from "@lingui/macro";
import cx from "classnames";

import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import AddressView from "components/AddressView/AddressView";
import Pagination from "components/Pagination/Pagination";
import TokenIcon from "components/TokenIcon/TokenIcon";
import Tooltip from "components/Tooltip/Tooltip";
import Table from "components/Table/Table";
import { TableHeader } from "components/Table/types";
import { useChainId } from "lib/chains";
import { formatUsd, formatPrice, formatDeltaUsd } from "lib/numbers";
import { formatLeverage } from "domain/synthetics/positions";
import {
  TopPositionsRow,
  formatDelta,
  signedValueClassName,
  OpenPosition,
  Ranked,
  RemoteData,
} from "domain/synthetics/leaderboards";

type TopPositionsProps = {
  positions: RemoteData<OpenPosition>;
  search: string;
};

export default function TopPositions({ positions, search }: TopPositionsProps) {
  const perPage = 15;
  const { chainId } = useChainId();
  const { isLoading, error, data } = positions;
  const [page, setPage] = useState(1);
  const [orderBy, setOrderBy] = useState<keyof OpenPosition>("unrealizedPnlAfterFees");
  const [direction, setDirection] = useState<number>(1);
  const onColumnClick = useCallback(
    (key: keyof OpenPosition) => () => {
      if (key === orderBy) {
        setDirection((d: number) => -1 * d);
      } else {
        setOrderBy(key);
        setDirection(1);
      }
    },
    [orderBy, setOrderBy, setDirection]
  );

  const positionsHash = (data || []).map((p) => p[orderBy]!.toString()).join("-");
  const positionRows: Ranked<OpenPosition>[] = useMemo(() => {
    if (!data) {
      return [];
    }

    const result = data
      .map((p, i) => ({ ...p, rank: i }))
      .sort((a, b) => {
        const key = orderBy;
        if (BigNumber.isBigNumber(a[key]) && BigNumber.isBigNumber(b[key])) {
          return direction * ((a[key] as BigNumber).gt(b[key] as BigNumber) ? -1 : 1);
        } else {
          return 0;
        }
      });

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId, positionsHash, orderBy, direction]);

  const filteredStats = positionRows.filter(
    (p) =>
      p.account.toLowerCase().indexOf(search) >= 0 || p.marketInfo.indexToken.symbol.toLowerCase().indexOf(search) >= 0
  );

  const parseRow = useCallback(
    (p: Ranked<OpenPosition>, i: number): TopPositionsRow => ({
      key: p.key,
      rank: {
        value: () => <span className={cx(p.rank < 3 && `LeaderboardRank-${p.rank + 1}`)}>{p.rank + 1}</span>,
      },
      account: {
        value: (breakpoint) =>
          p.account && (
            <AddressView
              address={p.account}
              breakpoint={breakpoint}
              lengths={{ S: 9, M: 11, L: 20, XL: 25 }}
              size={24}
            />
          ),
      },
      unrealizedPnl: {
        className: signedValueClassName(p.unrealizedPnlAfterFees),
        value: (p.unrealizedPnlAfterFees && formatDelta(p.unrealizedPnlAfterFees, { signed: true, prefix: "$" })) || "",
      },
      position: {
        className: "TopPositionsPositionCell",
        value: () => (
          <Tooltip
            handle={
              <span className="TopPositionsPositionView">
                <TokenIcon
                  className="PositionList-token-icon"
                  symbol={p.marketInfo.indexToken.symbol}
                  displaySize={20}
                  importSize={24}
                />
                <span className="TopPositionsSymbol">{p.marketInfo.indexToken.symbol}</span>
                <span className={cx("TopPositionsDirection", p.isLong ? "positive" : "negative")}>
                  {p.isLong ? t`Long` : t`Short`}
                </span>
              </span>
            }
            position={i > 7 ? "right-top" : "right-bottom"}
            className="nowrap"
            renderContent={() => (
              <>
                <span className="TopPositionsMarketName">{p.marketInfo.name}</span>
                <span className={cx(p.isLong ? "positive" : "negative")}>{p.isLong ? t`Long` : t`Short`}</span>
              </>
            )}
          />
        ),
      },
      entryPrice: {
        value: formatPrice(p.entryPrice, chainId, p.marketInfo.indexToken.symbol) || "",
      },
      size: {
        value: () => (
          <Tooltip
            handle={formatUsd(p.sizeInUsd) || ""}
            position={i > 7 ? "right-top" : "right-bottom"}
            className="nowrap"
            renderContent={() => (
              <StatsTooltipRow
                label={t`Collateral`}
                showDollar={false}
                value={<span>{formatUsd(p.collateralAmountUsd) || ""}</span>}
              />
            )}
          />
        ),
      },
      leverage: { value: formatLeverage(p.leverage) || "" },
      liqPrice: {
        value: () => (
          <Tooltip
            handle={p.liquidationPrice ? formatPrice(p.liquidationPrice, chainId, p.marketInfo.indexToken.symbol) : "NA"}
            position={i > 7 ? "right-top" : "right-bottom"}
            className="nowrap"
            renderContent={() => p.liquidationPrice ? (
              <>
                <StatsTooltipRow
                  label={t`Mark Price`}
                  showDollar={false}
                  value={<span>{formatPrice(p.markPrice, chainId, p.marketInfo.indexToken.symbol)}</span>}
                />
                <StatsTooltipRow
                  label={t`Price change to Liq.`}
                  showDollar={false}
                  value={
                    <span>
                      {p.liquidationPriceDelta && p.liquidationPriceDeltaRel
                        ? formatDeltaUsd(p.liquidationPriceDelta, p.liquidationPriceDeltaRel, {
                            maxThreshold: "1000000",
                          })
                        : ""}
                    </span>
                  }
                />
              </>
            ) : (
              <div className="NoLiqPriceTooltip">
                {t`No Liquidation Price as the Position's Collateral value will increase to cover any negative PnL.`}
              </div>
            )}
          />
        ),
      },
    }),
    [chainId]
  );

  const indexFrom = (page - 1) * perPage;
  const rows = filteredStats.slice(indexFrom, indexFrom + perPage).map(parseRow);
  const pageCount = Math.ceil(filteredStats.length / perPage);
  const getSortableClass = (key: keyof OpenPosition) =>
    cx(orderBy === key ? (direction > 0 ? "sorted-asc" : "sorted-desc") : "sortable");

  const titles: { [k in keyof TopPositionsRow]?: TableHeader } = {
    rank: { title: t`Rank`, width: 6 },
    account: { title: t`Address`, width: (p = "XL") => ({ XL: 26, L: 22, M: 16, S: 10 }[p] || 26) },
    unrealizedPnl: {
      title: t`PnL ($)`,
      tooltip: t`Total Unrealized Profit and Loss.`,
      onClick: onColumnClick("unrealizedPnlAfterFees"),
      width: 12,
      className: getSortableClass("unrealizedPnlAfterFees"),
    },
    position: {
      title: t`Position`,
      width: 12,
    },
    entryPrice: {
      title: t`Entry`,
      width: 10,
    },
    size: {
      title: t`Size`,
      onClick: onColumnClick("sizeInUsd"),
      width: 13,
      className: getSortableClass("sizeInUsd"),
    },
    leverage: {
      tooltip: t`Position Leverage.`,
      title: t`Lev.`,
      width: 8,
      onClick: onColumnClick("leverage"),
      className: getSortableClass("leverage"),
    },
    liqPrice: {
      title: t`Liq. Price`,
      width: 13,
    },
  };

  return (
    <div>
      <Table
        isLoading={isLoading}
        error={error}
        content={rows}
        titles={titles}
        rowKey={"key"}
        className="TopPositionsLeaderboard"
      />
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}
