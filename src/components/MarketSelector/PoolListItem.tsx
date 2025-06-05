import cx from "classnames";
import { useCallback } from "react";

import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  getGlvDisplayName,
  getMarketBadge,
  getGlvOrMarketAddress,
  GlvOrMarketInfo,
  getMarketPoolName,
} from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { TokenData } from "domain/synthetics/tokens";
import { formatTokenAmount, formatUsd } from "lib/numbers";
import { getNormalizedTokenSymbol } from "sdk/configs/tokens";

import FavoriteStar from "components/FavoriteStar/FavoriteStar";
import TokenIcon from "components/TokenIcon/TokenIcon";

import { MarketOption, MarketState } from "./types";
import TooltipWithPortal from "../Tooltip/TooltipWithPortal";

export function PoolListItem(props: {
  glvOrMarketInfo: GlvOrMarketInfo;
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
    glvOrMarketInfo,
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
  const { longToken, shortToken } = glvOrMarketInfo;
  const chainId = useSelector(selectChainId);

  const indexTokenImage = glvOrMarketInfo.isSpotOnly
    ? getNormalizedTokenSymbol(longToken.symbol) + getNormalizedTokenSymbol(shortToken.symbol)
    : getNormalizedTokenSymbol(
        isGlvInfo(glvOrMarketInfo) ? glvOrMarketInfo.glvToken.symbol : glvOrMarketInfo.indexToken.symbol
      );

  const handleFavoriteClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onFavoriteClick(getGlvOrMarketAddress(glvOrMarketInfo));
  };

  const handleClick = useCallback(() => {
    if (state.disabled) {
      return;
    }

    onSelectOption({
      glvOrMarketInfo: glvOrMarketInfo,
      indexName,
      poolName,
      balance,
      balanceUsd,
      state,
      name: isGlvInfo(glvOrMarketInfo) ? glvOrMarketInfo.name ?? "GLV" : glvOrMarketInfo.name,
    });
  }, [balance, balanceUsd, indexName, glvOrMarketInfo, onSelectOption, poolName, state]);

  const tokenBadge = getMarketBadge(chainId, glvOrMarketInfo);

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
              {isGlvInfo(glvOrMarketInfo) ? (
                <div className="flex items-center leading-1">
                  <span>{getGlvDisplayName(glvOrMarketInfo)}</span>
                  <span className="subtext">[{poolName}]</span>
                </div>
              ) : showAllPools ? (
                <div className="flex items-center leading-1">
                  <span>{indexName && indexName}</span>
                  <span className="subtext">[{getMarketPoolName(glvOrMarketInfo, "/")}]</span>
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
