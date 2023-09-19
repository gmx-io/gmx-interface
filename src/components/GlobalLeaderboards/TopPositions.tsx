import { useState, useCallback, useMemo } from "react";
import { BigNumber } from "ethers";
import { t } from "@lingui/macro";
import cx from "classnames";

import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import SearchInput from "components/SearchInput/SearchInput";
import AddressView from "components/AddressView/AddressView";
import Pagination from "components/Pagination/Pagination";
import TokenIcon from "components/TokenIcon/TokenIcon";
import Tooltip from "components/Tooltip/Tooltip";
import Table from "components/Table/Table";
import { TableHeader } from "components/Table/types";
import { useChainId } from "lib/chains";
import { useDebounce } from "lib/useDebounce";
import { formatUsd, formatPrice, formatDeltaUsd } from "lib/numbers";
import { formatLeverage } from "domain/synthetics/positions";
import {
  TopPositionsRow,
  formatDelta,
  signedValueClassName,
  OpenPosition,
  Ranked,
} from "domain/synthetics/leaderboards";

import { useLeaderboardContext } from "./Context";

export default function TopPositions() {
  const perPage = 15;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const term = useDebounce(search, 300);
  const { chainId } = useChainId();
  const { positions: { isLoading, error, data } } = useLeaderboardContext();
  const [orderBy, setOrderBy] = useState<keyof OpenPosition>("unrealizedPnlAfterFees");
  const [direction, setDirection] = useState<number>(1);
  const topPositionsHeaderClick = useCallback((key: keyof OpenPosition) => () => {
    if (key === orderBy) {
      setDirection((d: number) => -1 * d);
    } else {
      setOrderBy(key);
      setDirection(1);
    }
  }, [orderBy, setOrderBy, setDirection]);

  const positionsHash = (data || []).map(p => p[orderBy]!.toString()).join("-");
  const positions: Ranked<OpenPosition>[] = useMemo(() => {
    if (!data) {
      return [];
    }

    const result = data.map((p, i) => ({...p, rank: i})).sort((a, b) => {
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

  const filteredStats = positions.filter((p) => (
    p.account.toLowerCase().indexOf(term) >= 0 ||
    p.marketInfo.indexToken.symbol.toLowerCase().indexOf(term) >= 0
  ));

  const parseRow = useCallback((p: Ranked<OpenPosition>, i: number): TopPositionsRow => ({
    key: p.key,
    rank: {
      value: () => (
        <span className={cx(p.rank < 3 && `LeaderboardRank-${p.rank + 1}`)}>{p.rank + 1}</span>
      ),
    },
    account: {
      value: (breakpoint) =>
        p.account && (
          <AddressView
            address={p.account}
            ensName={p.ensName}
            avatarUrl={p.avatarUrl}
            breakpoint={breakpoint}
            lengths={{ S: 9, M: 13 }}
            size={24}
          />
        ),
    },
    unrealizedPnl: {
      className: signedValueClassName(p.unrealizedPnlAfterFees),
      value: (p.unrealizedPnlAfterFees && formatDelta(
        p.unrealizedPnlAfterFees,
        { signed: true, prefix: "$" }
      )) || "",
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
              <span className="TopPositionsSymbol">
                {p.marketInfo.indexToken.symbol}
              </span>
              <span className={cx("TopPositionsDirection", p.isLong ? "positive" : "negative")}>
                {p.isLong ? t`Long` : t`Short`}
              </span>
            </span>
          }
          position={ i > 7 ? "right-top" : "right-bottom" }
          className="nowrap"
          renderContent={() =>
            <>
              <span className="TopPositionsMarketName">{p.marketInfo.name}</span>
              <span className={cx(p.isLong ? "positive" : "negative")}>
                {p.isLong ? t`Long` : t`Short`}
              </span>
            </>
          }
        />
      ),
    },
    entryPrice: {
      value: formatPrice(p.entryPrice, chainId, p.marketInfo.indexToken.symbol) || "",
    },
    size: {
      value: () => <Tooltip
        handle={ formatUsd(p.sizeInUsd) || "" }
        position={ i > 7 ? "right-top" : "right-bottom" }
        className="nowrap"
        renderContent={() => (
          <StatsTooltipRow
            label={t`Collateral`}
            showDollar={false}
            value={<span>{formatUsd(p.collateralAmountUsd) || ""}</span>}
          />
        )}
      />
    },
    leverage: { value: formatLeverage(p.leverage) || "" },
    liqPrice: {
      value: () => (
        <Tooltip
          handle={formatPrice(p.liquidationPrice!, chainId, p.marketInfo.indexToken.symbol) || ""}
          position={ i > 7 ? "right-top" : "right-bottom" }
          className="nowrap"
          renderContent={() => (
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
                      ? formatDeltaUsd(p.liquidationPriceDelta, p.liquidationPriceDeltaRel, { maxThreshold: "1000000" })
                      : ""
                    }
                  </span>
                }
              />
            </>
          )}
        />
      ),
    },
  }), [chainId])

  const indexFrom = (page - 1) * perPage;
  const rows = filteredStats.slice(indexFrom, indexFrom + perPage).map(parseRow);
  const pageCount = Math.ceil(filteredStats.length / perPage);
  const handleSearchInput = (e) => setSearch(e.target.value.trim().toLowerCase());
  const getSortableClass = (key: keyof OpenPosition) => cx(orderBy === key
    ? (direction > 0 ? "sorted-asc" : "sorted-desc")
    : "sortable"
  )
  const titles: { [k in keyof TopPositionsRow]?: TableHeader } = {
    rank: { title: t`Rank`, width: 5 },
    account: { title: t`Address`, width: (p = "L") => ({ L: 40, M: 16, S: 10 }[p] || 40) },
    unrealizedPnl: {
      title: t`PnL ($)`,
      tooltip: t`Total Unrealized Profit and Loss.`,
      onClick: topPositionsHeaderClick("unrealizedPnlAfterFees"),
      width: 10,
      className: getSortableClass("unrealizedPnlAfterFees"),
    },
    position: {
      title: t`Position`,
      width: 5,
    },
    entryPrice: {
      title: t`Entry`,
      width: 10,
    },
    size: {
      title: t`Size`,
      onClick: topPositionsHeaderClick("sizeInUsd"),
      width: 10,
      className: getSortableClass("sizeInUsd"),
    },
    leverage: {
      tooltip: t`Position Leverage.`,
      title: t`Lev.`,
      width: 10,
      onClick: topPositionsHeaderClick("leverage"),
      className: getSortableClass("leverage"),
    },
    liqPrice: {
      title: t`Liq. Price`,
      width: 10,
    },
  };

  return (
    <div>
      <div className="LeaderboardHeader">
        <SearchInput
          placeholder={t`Search Address or Market`}
          value={search}
          onInput={handleSearchInput}
          setValue={() => {}}
          onKeyDown={() => {}}
          className="LeaderboardSearch TopPositionsSearch"
          autoFocus={false}
        />
      </div>
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
