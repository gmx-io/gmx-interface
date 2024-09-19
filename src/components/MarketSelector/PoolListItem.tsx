import cx from "classnames";
import { useCallback } from "react";

import { getNormalizedTokenSymbol } from "config/tokens";

import { useSelector } from "context/SyntheticsStateContext/utils";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";

import { getGlvDisplayName, getMarketBadge, getGlvOrMarketAddress, GlvOrMarketInfo } from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { TokenData } from "domain/synthetics/tokens";

import { formatTokenAmount, formatUsd } from "lib/numbers";

import FavoriteStar from "components/FavoriteStar/FavoriteStar";
import TokenIcon from "components/TokenIcon/TokenIcon";

import TooltipWithPortal from "../Tooltip/TooltipWithPortal";
import { MarketOption, MarketState } from "./types";

export function PoolListItem(props: {
  marketInfo: GlvOrMarketInfo;
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
  const { longToken, shortToken } = marketInfo;
  const chainId = useSelector(selectChainId);

  const indexTokenImage = marketInfo.isSpotOnly
    ? getNormalizedTokenSymbol(longToken.symbol) + getNormalizedTokenSymbol(shortToken.symbol)
    : getNormalizedTokenSymbol(isGlvInfo(marketInfo) ? marketInfo.glvToken.symbol : marketInfo.indexToken.symbol);

  const handleFavoriteClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onFavoriteClick(getGlvOrMarketAddress(marketInfo));
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
      name: isGlvInfo(marketInfo) ? marketInfo.name ?? "GLV" : marketInfo.name,
    });
  }, [balance, balanceUsd, indexName, marketInfo, onSelectOption, poolName, state]);

  const tokenBadge = getMarketBadge(chainId, marketInfo);

  return (
    <>
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
              <TokenIcon symbol={indexTokenImage} displaySize={40} importSize={40} badge={tokenBadge} />
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
              {isGlvInfo(marketInfo) ? (
                <div className="flex items-center leading-1">
                  <span>{getGlvDisplayName(marketInfo)}</span>
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
              {(showBalances && balanceUsd !== undefined && balanceUsd > 0 && <div>{formatUsd(balanceUsd)}</div>) ||
                null}
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
      {state.warning && <p className="mb-8 text-14 opacity-50 last:mb-0">{state.warning}</p>}
    </>
  );
}
