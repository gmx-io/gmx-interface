import { useState, useCallback, useMemo } from "react";
import cx from "classnames";
import { t } from "@lingui/macro";
import Pagination from "components/Pagination/Pagination";
import Table from "components/Table/Table";
import SearchInput from "components/SearchInput/SearchInput";
import { useDebounce } from "lib/useDebounce";
import { formatAmount, formatUsd, formatPrice } from "lib/numbers";
import { formatLeverage } from "domain/synthetics/positions";
import { TableCell, TableHeader } from "components/Table/types";
import { USD_DECIMALS, importImage } from "lib/legacy";
import AddressView from "components/AddressView/AddressView";
import { TopPositionsRow, formatDelta, signedValueClassName } from "domain/synthetics/leaderboards";
import Tooltip from "components/Tooltip/Tooltip";
import { useChainId } from "lib/chains";
import { useLeaderboardContext } from "./Context";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { BigNumber } from "ethers";

const parseRow =
  (chainId: number) =>
  (p: TopPositionsRow): { [key in keyof TopPositionsRow]?: TableCell } => ({
    key: p.key,
    rank: p.rank + 1,
    account: {
      value: (breakpoint) =>
        p.account && (
          <AddressView
            address={p.account}
            ensName={p.ensName}
            avatarUrl={p.avatarUrl}
            breakpoint={breakpoint}
            size={24}
            maxLength={11}
          />
        ),
    },
    unrealizedPnl: {
      value: (p.unrealizedPnl && formatDelta(p.unrealizedPnl, { signed: true, prefix: "$" })) || "",
      className: signedValueClassName(p.unrealizedPnl),
    },
    market: {
      value: () => {
        const { symbol } = p.market.indexToken;
        const { name } = p.market;

        return (
          <div className="TopPositionsItem">
            <img src={importImage(`ic_${symbol.toLocaleLowerCase()}_40.svg`)} alt={name} width="24" />
            <span>{symbol}</span>
          </div>
        );
      },
    },
    isLong: {
      value: () => (
        <span className={p.isLong ? "positive" : "negative"}>{p.isLong ? t`Long` : t`Short`}</span>
      ),
    },
    entryPrice: {
      value: formatPrice(p.entryPrice, chainId, p.market.indexToken.symbol) || "",
    },
    size: { value: formatUsd(p.size) || "" },
    leverage: { value: formatLeverage(p.leverage) || "" },
    collateral: { value: formatUsd(p.collateral) || "" },
    liqPrice: {
      value: () => (
        <Tooltip
          handle={p.liqPrice ? formatPrice(p.liqPrice, chainId, p.market.indexToken.symbol) : ""}
          position="center-top"
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
                    {!p.liqPriceDelta || !p.liqPriceDeltaRel
                      ? ""
                      : `${formatPrice(p.liqPriceDelta, chainId, p.market.indexToken.symbol)} (${formatAmount(
                          p.liqPriceDeltaRel,
                          USD_DECIMALS,
                          2,
                          true
                        )}%)`}
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

    return [...topPositions.data].sort((a, b) => {
      const key = positionsOrderBy;
      if (BigNumber.isBigNumber(a[key]) && BigNumber.isBigNumber(b[key])) {
        return positionsOrderDirection * ((a[key] as BigNumber).gt(b[key] as BigNumber) ? -1 : 1);
      } else {
        return 1;
      }
    }).map((p, i) => ({ ...p, rank: i }));
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
    rank: { title: t`Rank`, width: 7 },
    account: { title: t`Address`, width: 23 },
    market: { title: t`Market`, width: 8 },
    isLong: { title: t`Direction`, width: 8 },
    unrealizedPnl: {
      title: t`PnL ($)`,
      tooltip: t`Total Unrealized Profit.`,
      onClick: topPositionsHeaderClick("unrealizedPnl"),
      width: 9,
      className: getSortableClass("unrealizedPnl"),
    },
    entryPrice: { title: t`Entry`, width: 9 },
    size: {
      title: t`Size`,
      onClick: topPositionsHeaderClick("size"),
      width: 9,
      className: getSortableClass("size"),
    },
    collateral: {
      title: t`Collateral`,
      onClick: topPositionsHeaderClick("collateral"),
      width: 9,
      className: getSortableClass("collateral"),
    },
    leverage: {
      title: t`Leverage`,
      width: 9,
      onClick: topPositionsHeaderClick("leverage"),
      className: getSortableClass("leverage"),
    },
    liqPrice: {
      title: t`Liq. Price`,
      width: 9,
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
      <Table isLoading={isLoading} error={error} content={rows} titles={titles} rowKey={"key"} />
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}
