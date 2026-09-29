import { t, Trans } from "@lingui/macro";
import cx from "classnames";

import { ContractsChainId } from "config/chains";
import { getMarketIndexName, getMarketPoolName, GlvAndGmMarketsInfoData } from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { useChainId } from "lib/chains";
import { mustNeverExist } from "lib/types";
import { useBreakpoints } from "lib/useBreakpoints";
import { getNormalizedTokenSymbol, getToken } from "sdk/configs/tokens";

import TokenIcon from "components/TokenIcon/TokenIcon";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import GlvRoundedIcon from "img/ic_glv_rounded.svg?react";
import GmxRoundedIcon from "img/ic_gmx_rounded.svg?react";

import { getOpportunityAssetKey, getOpportunityAssetLabel, OpportunityAsset } from "./useOpportunities";

export function OpportunityAssets({
  assets,
  marketsInfoData,
}: {
  assets: OpportunityAsset[];
  marketsInfoData: GlvAndGmMarketsInfoData | undefined;
}) {
  const { chainId } = useChainId();
  const { isSmallMobile } = useBreakpoints();

  const resolvedAssets = assets.filter(
    (asset) => getOpportunityAssetLabel(asset, { chainId, marketsInfoData }) !== undefined
  );

  if (!resolvedAssets.length) {
    return null;
  }

  const maxVisibleAssets = isSmallMobile ? 2 : 3;
  const visibleAssets = resolvedAssets.slice(0, maxVisibleAssets);
  const remainingCount = resolvedAssets.length - visibleAssets.length;

  return (
    <TooltipWithPortal
      handle={
        <div className="flex items-center justify-end">
          {visibleAssets.map((token) => (
            <span key={getOpportunityAssetKey(token)} className="relative -mr-6 size-24">
              <OpportunityTokenIcon
                asset={token}
                chainId={chainId}
                marketsInfoData={marketsInfoData}
                className="absolute left-0 border-2 border-slate-700 "
              />
            </span>
          ))}
          {remainingCount > 0 ? (
            <div className="relative -mr-6 size-24">
              <span
                className={cx(
                  "flex size-24 items-center justify-center rounded-full border-2 border-slate-700",
                  "bg-slate-700 text-[11px] font-medium normal-nums text-typography-secondary"
                )}
              >
                +{remainingCount}
              </span>
            </div>
          ) : null}
        </div>
      }
      content={
        <div className="text-body-small flex flex-col gap-6">
          {resolvedAssets.map((token) => (
            <span key={getOpportunityAssetKey(token)} className="flex items-center gap-6">
              <OpportunityTokenIcon asset={token} chainId={chainId} marketsInfoData={marketsInfoData} />

              <OpportunityTokenLabel asset={token} chainId={chainId} marketsInfoData={marketsInfoData} />
            </span>
          ))}
        </div>
      }
      variant="none"
      position="bottom"
      className="h-24"
    />
  );
}

function OpportunityTokenIcon({
  asset,
  chainId,
  marketsInfoData,
  className: _className,
}: {
  asset: OpportunityAsset;
  chainId: ContractsChainId;
  marketsInfoData: GlvAndGmMarketsInfoData | undefined;
  className?: string;
}) {
  const className = cx("size-24 rounded-full", _className);
  const displaySize = 24;

  switch (asset.type) {
    case "stGmx":
      return <GmxRoundedIcon className={className} />;
    case "glv":
      return <GlvRoundedIcon className={className} />;
    case "market": {
      const marketInfo = marketsInfoData?.[asset.address];

      if (marketInfo && !isGlvInfo(marketInfo)) {
        const iconSymbol = marketInfo.isSpotOnly
          ? getNormalizedTokenSymbol(marketInfo.longToken.symbol) +
            getNormalizedTokenSymbol(marketInfo.shortToken.symbol)
          : getNormalizedTokenSymbol(marketInfo.indexToken.symbol);

        return <TokenIcon displaySize={displaySize} symbol={iconSymbol} className={className} />;
      }

      return null;
    }
    case "token": {
      const { symbol } = getToken(chainId, asset.address);

      if (symbol === "GMX") {
        return <GmxRoundedIcon className={className} />;
      }

      return <TokenIcon displaySize={displaySize} symbol={symbol} className={className} />;
    }
    default:
      mustNeverExist(asset);
  }
}

const OpportunityTokenLabel = ({
  asset,
  chainId,
  marketsInfoData,
}: {
  asset: OpportunityAsset;
  chainId: ContractsChainId;
  marketsInfoData: GlvAndGmMarketsInfoData | undefined;
}) => {
  switch (asset.type) {
    case "stGmx": {
      return t`Staked GMX`;
    }
    case "token": {
      return getToken(chainId, asset.address).symbol;
    }
    case "glv": {
      const glvInfo = marketsInfoData?.[asset.address];
      if (glvInfo) {
        const poolName = getMarketPoolName(glvInfo);
        return (
          <span>
            <span className="font-medium text-typography-primary">
              <Trans>GLV</Trans>{" "}
            </span>
            <span className="text-typography-secondary">[{poolName}]</span>
          </span>
        );
      }
      return null;
    }
    case "market": {
      const marketInfo = marketsInfoData?.[asset.address];
      if (marketInfo) {
        const indexName = getMarketIndexName(marketInfo);
        const poolName = getMarketPoolName(marketInfo);
        return (
          <span>
            <span className="font-medium text-typography-primary">
              <Trans>GM: {indexName}</Trans>{" "}
            </span>
            <span className="text-typography-secondary">[{poolName}]</span>
          </span>
        );
      }
      return null;
    }
    default:
      mustNeverExist(asset);
  }
};
