import { useState, useCallback, useMemo } from "react";
import cx from "classnames";
import { t } from "@lingui/macro";
import Pagination from "components/Pagination/Pagination";
import Table from "components/Table/Table";
import SearchInput from "components/SearchInput/SearchInput";
import { useDebounce } from "lib/useDebounce";
import { formatUsd, formatPrice, formatDeltaUsd } from "lib/numbers";
import { formatLeverage } from "domain/synthetics/positions";
import { TableCell, TableHeader } from "components/Table/types";
import AddressView from "components/AddressView/AddressView";
import { TopPositionsRow, formatDelta, signedValueClassName } from "domain/synthetics/leaderboards";
import Tooltip from "components/Tooltip/Tooltip";
import { useChainId } from "lib/chains";
import { useLeaderboardContext } from "./Context";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { BigNumber } from "ethers";
import TokenIcon from "components/TokenIcon/TokenIcon";

const parseRow =
  (chainId: number) =>
  (p: TopPositionsRow): { [key in keyof TopPositionsRow]?: TableCell } => ({
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
            size={24}
            maxLength={breakpoint === "S" ? 9 : undefined}
          />
        ),
    },
    unrealizedPnl: {
      value: (p.unrealizedPnl && formatDelta(p.unrealizedPnl, { signed: true, prefix: "$" })) || "",
      className: signedValueClassName(p.unrealizedPnl),
    },
    market: {
      className: "TopPositionsPositionCell",
      value: () => (
        <Tooltip
          handle={
            <span className="TopPositionsPositionView">
              <TokenIcon
                className="PositionList-token-icon"
                symbol={p.market.indexToken.symbol}
                displaySize={20}
                importSize={24}
              />
              <span className="TopPositionsSymbol">
                {p.market.indexToken.symbol}
              </span>
              <span className={cx("TopPositionsDirection", p.isLong ? "positive" : "negative")}>
                {p.isLong ? t`Long` : t`Short`}
              </span>
            </span>
          }
          position="center-top"
          className="nowrap"
          renderContent={() =>
            <>
              <span className="TopPositionsMarketName">{p.market.name}</span>
              <span className={cx(p.isLong ? "positive" : "negative")}>
                {p.isLong ? t`Long` : t`Short`}
              </span>
            </>
          }
        />
      ),
    },
    entryPrice: {
      value: formatPrice(p.entryPrice, chainId, p.market.indexToken.symbol) || "",
    },
    size: {
      value: () => <Tooltip
        handle={ formatUsd(p.size) || "" }
        position="center-top"
        className="nowrap"
        renderContent={() => (
          <StatsTooltipRow
            label={t`Collateral`}
            showDollar={false}
            value={<span>{formatUsd(p.collateral) || ""}</span>}
          />
        )}
      />
    },
    leverage: { value: formatLeverage(p.leverage) || "" },
    liqPrice: {
      value: () => (
        <Tooltip
          handle={formatPrice(p.liqPrice!, chainId, p.market.indexToken.symbol, {
            fallbackToZero: true
          })}
          position="right-bottom"
          className="nowrap"
          renderContent={() => (
            <>
              <StatsTooltipRow
                label={t`Mark Price`}
                showDollar={false}
                value={<span>{formatPrice(p.markPrice, chainId, p.market.indexToken.symbol)}</span>}
              />
              <StatsTooltipRow
                label={t`Price change to Liq.`}
                showDollar={false}
                value={
                  <span>
                    {p.liqPriceDelta && p.liqPriceDeltaRel
                      ? formatDeltaUsd(p.liqPriceDelta, p.liqPriceDeltaRel, { maxThreshold: "1000000" })
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
  });

export default function TopPositions() {
  const perPage = 15;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const term = useDebounce(search, 300);
  const { chainId } = useChainId();
  const { topPositions } = useLeaderboardContext();
  const { isLoading, error, data } = topPositions;
  const [positionsOrderBy, setPositionsOrderBy] = useState<keyof TopPositionsRow>("unrealizedPnl");
  const [positionsOrderDirection, setPositionsOrderDirection] = useState<number>(1);
  const topPositionsHeaderClick = useCallback((key: keyof TopPositionsRow) => () => {
    if (key === positionsOrderBy) {
      setPositionsOrderDirection((d: number) => -1 * d);
    } else {
      setPositionsOrderBy(key);
      setPositionsOrderDirection(1);
    }
  }, [positionsOrderBy, setPositionsOrderBy, setPositionsOrderDirection]);

  const positionsHash = (data || []).map(p => p[positionsOrderBy]!.toString()).join("-");
  const positions = useMemo(() => {
    if (!topPositions.data) {
      return [];
    }

    const result = [...topPositions.data].sort((a, b) => {
      const key = positionsOrderBy;
      if (BigNumber.isBigNumber(a[key]) && BigNumber.isBigNumber(b[key])) {
        return positionsOrderDirection * ((a[key] as BigNumber).gt(b[key] as BigNumber) ? -1 : 1);
      } else {
        return 1;
      }
    });

    if (positionsOrderBy === "unrealizedPnl") {
      for (let i = 0; i < result.length; i++) {
        result[i].rank = i;
      }
    }

    return result;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionsHash, positionsOrderBy, positionsOrderDirection]);

  const filteredStats = positions.filter((p) => (
    p.account.toLowerCase().indexOf(term) >= 0 ||
    p.market.indexToken.symbol.toLowerCase().indexOf(term) >= 0
  ));

  const indexFrom = (page - 1) * perPage;
  const rows = filteredStats.slice(indexFrom, indexFrom + perPage).map(parseRow(chainId));
  const pageCount = Math.ceil(filteredStats.length / perPage);
  const handleSearchInput = (e) => setSearch(e.target.value.trim().toLowerCase());
  const getSortableClass = (key: keyof TopPositionsRow) => cx(positionsOrderBy === key
    ? (positionsOrderDirection > 0 ? "sorted-asc" : "sorted-desc")
    : "sortable"
  )
  const titles: { [k in keyof TopPositionsRow]?: TableHeader } = {
    rank: { title: t`Rank`, width: 5 },
    account: { title: t`Address`, width: 40 },
    unrealizedPnl: {
      title: t`PnL ($)`,
      tooltip: t`Total Unrealized Profit and Loss.`,
      onClick: topPositionsHeaderClick("unrealizedPnl"),
      width: 10,
      className: getSortableClass("unrealizedPnl"),
    },
    market: {
      title: t`Position`,
      width: 5,
    },
    entryPrice: {
      title: t`Entry`,
      width: 10,
    },
    size: {
      title: t`Size`,
      onClick: topPositionsHeaderClick("size"),
      width: 10,
      className: getSortableClass("size"),
    },
    leverage: {
      title: t`Leverage`,
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
