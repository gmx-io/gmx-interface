import cx from "classnames";
import { useCallback } from "react";

import { getNormalizedTokenSymbol } from "config/tokens";
import { MarketInfo } from "domain/synthetics/markets";
import { TokenData } from "domain/synthetics/tokens";
import { formatTokenAmount, formatUsd } from "lib/numbers";

import FavoriteStar from "components/FavoriteStar/FavoriteStar";
import TokenIcon from "components/TokenIcon/TokenIcon";
import TooltipWithPortal from "../Tooltip/TooltipWithPortal";

import { isGlv } from "domain/synthetics/markets/glv";
import { MarketOption, MarketState } from "./types";

export function PoolListItem(props: {
  marketInfo: MarketInfo;
  marketToken?: TokenData;
  poolName: string;
  balance: bigint;
  balanceUsd: bigint;
  indexName: string;
  state?: MarketState;
  isFavorite: boolean;
  isInFirstHalf: boolean;
  showAllPools?: boolean;
  showBalances?: boolean;
  onFavoriteClick: (address: string) => void;
  onSelectOption: (option: MarketOption) => void;
}) {
  const {
    marketInfo,
    poolName,
    balance,
    balanceUsd,
    indexName,
    state = {},
    marketToken,
    isFavorite,
    isInFirstHalf,
    showAllPools,
    showBalances,
    onFavoriteClick,
    onSelectOption,
  } = props;
  const { longToken, shortToken, indexToken } = marketInfo;

  const indexTokenImage = marketInfo.isSpotOnly
    ? getNormalizedTokenSymbol(longToken.symbol) + getNormalizedTokenSymbol(shortToken.symbol)
    : getNormalizedTokenSymbol(indexToken.symbol);

  const handleFavoriteClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onFavoriteClick(marketInfo.marketTokenAddress);
  };

  const handleClick = useCallback(() => {
    if (state.disabled) {
      return;
    }

    onSelectOption({
      marketInfo,
      indexName,
      poolName,
      balance,
      balanceUsd,
      state,
      name: marketInfo.name,
    });
  }, [balance, balanceUsd, indexName, marketInfo, onSelectOption, poolName, state]);

  return (
    <div className={cx("TokenSelector-token-row", { disabled: state.disabled })} onClick={handleClick}>
      {state.disabled && state.message && (
        <TooltipWithPortal
          className="TokenSelector-tooltip"
          handle={<div className="TokenSelector-tooltip-backing" />}
          position={isInFirstHalf ? "bottom" : "top"}
          disableHandleStyle
          closeOnDoubleClick
          fitHandleWidth
          content={state.message}
        />
      )}
      <div className="Token-info">
        <div className="collaterals-logo">
          {showAllPools ? (
            <TokenIcon symbol={indexTokenImage} displaySize={40} importSize={40} />
          ) : (
            <>
              <TokenIcon
                symbol={longToken.symbol}
                displaySize={40}
                importSize={40}
                className="collateral-logo collateral-logo-first"
              />
              {shortToken && (
                <TokenIcon
                  symbol={shortToken.symbol}
                  displaySize={40}
                  importSize={40}
                  className="collateral-logo collateral-logo-second"
                />
              )}
            </>
          )}
        </div>
        <div className="Token-symbol">
          <div className="Token-text">
            {isGlv(marketInfo) ? (
              <div className="flex items-center leading-1">
                <span>GLV: {marketInfo.name}</span>
                <span className="subtext">[{poolName}]</span>
              </div>
            ) : showAllPools ? (
              <div className="flex items-center leading-1">
                <span>{indexName && indexName}</span>
                <span className="subtext">{poolName && `[${poolName}]`}</span>
              </div>
            ) : (
              <div className="Token-text">{poolName}</div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="Token-balance">
          {(showBalances && balance !== undefined && (
            <div className="Token-text">
              {balance > 0
                ? formatTokenAmount(balance, marketToken?.decimals, "GM", {
                    useCommas: true,
                  })
                : "-"}
            </div>
          )) ||
            null}
          <span className="text-accent">
            {(showBalances && balanceUsd !== undefined && balanceUsd > 0 && <div>{formatUsd(balanceUsd)}</div>) || null}
          </span>
        </div>
        <div
          className="favorite-star flex cursor-pointer items-center rounded-4 p-9 text-16 hover:bg-cold-blue-700 active:bg-cold-blue-500"
          onClick={handleFavoriteClick}
        >
          <FavoriteStar isFavorite={isFavorite} />
        </div>
      </div>
    </div>
  );
}