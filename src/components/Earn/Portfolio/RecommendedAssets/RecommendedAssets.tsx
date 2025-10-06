import { Trans } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  getGlvOrMarketAddress,
  getMarketIndexName,
  getMarketPoolName,
  GlvInfo,
  GlvOrMarketInfo,
  isMarketInfo,
} from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { PerformanceData } from "domain/synthetics/markets/usePerformanceAnnualized";
import { convertToUsd, getMidPrice, TokensData } from "domain/tokens";
import { useChainId } from "lib/chains";
import { expandDecimals, formatPercentage, USD_DECIMALS } from "lib/numbers";
import { BuyGmxModal } from "pages/BuyGMX/BuyGmxModal";
import { AnyChainId } from "sdk/configs/chains";
import { getNormalizedTokenSymbol } from "sdk/configs/tokens";
import { MarketInfo, MarketTokensAPRData } from "sdk/types/markets";
import { getByKey } from "sdk/utils/objects";

import APRLabel from "components/APRLabel/APRLabel";
import Button from "components/Button/Button";
import TokenIcon from "components/TokenIcon/TokenIcon";

import BoltGradientIcon from "img/ic_bolt_gradient.svg?react";
import GmxIcon from "img/ic_gmx_40.svg?react";
import NewLinkIcon from "img/ic_new_link.svg?react";

const getRecommendedGlvs = ({
  hasGmxAssets,
  marketsInfoData,
}: {
  hasGmxAssets: boolean;
  marketsInfoData: { [marketAddress: string]: GlvOrMarketInfo };
}) => {
  const maxCount = !hasGmxAssets ? 1 : 2;

  const glvs = Object.values(marketsInfoData).filter((info): info is GlvInfo => {
    return isGlvInfo(info) && (typeof info.glvToken.balance === "undefined" || info.glvToken.balance <= 0n);
  });

  return glvs.slice(0, maxCount);
};

export const MIN_LIQUIDITY_USD = expandDecimals(500_000, USD_DECIMALS);

const getRecommendedGms = ({
  hasGmxAssets,
  marketsInfoData,
  glvsToShow,
  marketsApyInfo,
  marketTokensData,
  performance,
}: {
  hasGmxAssets: boolean;
  marketsInfoData: { [marketAddress: string]: GlvOrMarketInfo };
  glvsToShow: GlvInfo[];
  marketsApyInfo: MarketTokensAPRData;
  marketTokensData: TokensData;
  performance: PerformanceData;
}) => {
  let count = 4;

  if (!hasGmxAssets) {
    count = count - 1;
  }

  count = count - glvsToShow.length;

  return Object.values(marketsInfoData)
    .filter((info): info is MarketInfo => {
      if (!isMarketInfo(info)) {
        return false;
      }

      const balance = getByKey(marketTokensData, info.marketTokenAddress)?.balance;

      return typeof balance === "undefined" || balance <= 0n;
    })
    .filter((info) => {
      const midLongPrice = getMidPrice(info.longToken.prices);
      const midShortPrice = getMidPrice(info.shortToken.prices);

      const longPoolUsd = convertToUsd(info.longPoolAmount, info.longToken.decimals, midLongPrice);
      const shortPoolUsd = convertToUsd(info.shortPoolAmount, info.shortToken.decimals, midShortPrice);
      const totalPoolUsd = (longPoolUsd ?? 0n) + (shortPoolUsd ?? 0n);

      const poolPerformance = getByKey(performance, info.marketTokenAddress);

      return (
        !info.isDisabled &&
        totalPoolUsd >= MIN_LIQUIDITY_USD &&
        typeof poolPerformance !== "undefined" &&
        poolPerformance > 0n
      );
    })
    .sort((a, b) => {
      return (getByKey(marketsApyInfo, b.marketTokenAddress) ?? 0n) >
        (getByKey(marketsApyInfo, a.marketTokenAddress) ?? 0n)
        ? 1
        : -1;
    })
    .slice(0, count);
};

export function RecommendedAssets({
  hasGmxAssets,
  marketsInfoData,
  marketsApyInfo,
  glvsApyInfo,
  marketTokensData,
  performance,
}: {
  hasGmxAssets: boolean;
  marketsInfoData: { [marketAddress: string]: GlvOrMarketInfo };
  marketsApyInfo: MarketTokensAPRData;
  glvsApyInfo: MarketTokensAPRData;
  marketTokensData: TokensData;
  performance: PerformanceData;
}) {
  const { chainId } = useChainId();
  const glvsToShow = useMemo(() => {
    return getRecommendedGlvs({
      hasGmxAssets,
      marketsInfoData: marketsInfoData,
    });
  }, [hasGmxAssets, marketsInfoData]);

  const gmsToShow = useMemo(() => {
    return getRecommendedGms({
      hasGmxAssets,
      marketsInfoData: marketsInfoData,
      glvsToShow,
      marketsApyInfo,
      marketTokensData,
      performance,
    });
  }, [hasGmxAssets, marketsInfoData, glvsToShow, marketsApyInfo, marketTokensData, performance]);

  const [isBuyGmxModalVisible, setIsBuyGmxModalVisible] = useState(false);

  return (
    <section className="flex flex-col gap-8">
      <BuyGmxModal isVisible={isBuyGmxModalVisible} setIsVisible={setIsBuyGmxModalVisible} />
      <h2 className="flex items-center gap-4 pb-12 pt-20 text-24 font-medium text-typography-primary">
        <BoltGradientIcon className="inline-block size-20" />
        <Trans>Recommended</Trans>
      </h2>

      <div
        className={cx("grid grid-cols-4 gap-8 max-[1400px]:grid-cols-2 max-mobile:grid-cols-1", {
          "md:grid-flow-col": gmsToShow.length === 3,
        })}
      >
        {!hasGmxAssets && (
          <RecommendedAssetSection title={<Trans>GMX</Trans>}>
            {[
              <GmxRecommendedAssetItem
                key="gmx"
                chainId={chainId}
                openBuyGmxModal={() => setIsBuyGmxModalVisible(true)}
              />,
            ]}
          </RecommendedAssetSection>
        )}
        {glvsToShow.length > 0 && (
          <RecommendedAssetSection title={<Trans>GLV Vaults</Trans>}>
            {glvsToShow.map((glv) => (
              <GlvGmxRecommendedAssetItem
                key={glv.glvTokenAddress}
                glvOrMarketInfo={glv}
                feeApy={getByKey(glvsApyInfo, glv.glvTokenAddress)}
              />
            ))}
          </RecommendedAssetSection>
        )}
        {gmsToShow.length > 0 && (
          <RecommendedAssetSection
            title={<Trans>GM Pools</Trans>}
            rightCornerAction={
              <Link to="/pools" className="text-body-medium flex items-center gap-4 text-typography-secondary">
                <Trans>Explore more</Trans>
                <NewLinkIcon className="size-16" />
              </Link>
            }
          >
            {gmsToShow.map((gm) => (
              <GlvGmxRecommendedAssetItem
                key={gm.marketTokenAddress}
                glvOrMarketInfo={gm}
                feeApy={getByKey(marketsApyInfo, gm.marketTokenAddress)}
              />
            ))}
          </RecommendedAssetSection>
        )}
      </div>
    </section>
  );
}

function RecommendedAssetSection({
  title,
  rightCornerAction,
  children,
}: {
  title: ReactNode;
  rightCornerAction?: ReactNode;
  children: ReactNode[];
}) {
  return (
    <div
      className={cx("flex flex-col gap-12 rounded-8 bg-slate-900 px-20 py-16", {
        "col-span-1": children.length === 1,
        "col-span-2 max-mobile:col-span-1": children.length === 2,
        "col-span-3 max-mobile:col-span-1": children.length === 3,
        "col-span-4 max-mobile:col-span-1": children.length === 4,
      })}
    >
      <div className="flex items-center justify-between">
        <h5 className="text-body-medium flex items-center gap-4 font-medium text-typography-primary">{title}</h5>
        {rightCornerAction}
      </div>
      <div className="flex flex-wrap gap-12">{children}</div>
    </div>
  );
}

function GmxRecommendedAssetItem({ chainId, openBuyGmxModal }: { chainId: AnyChainId; openBuyGmxModal: () => void }) {
  return (
    <BaseRecommendedAssetItem
      icon={<GmxIcon className="size-32" />}
      title={<Trans>GMX</Trans>}
      metricValue={<APRLabel chainId={chainId} label="gmxAprTotal" />}
      metricLabel={<Trans>APR</Trans>}
      button={
        <Button variant="primary" onClick={openBuyGmxModal}>
          <Trans>Buy GMX</Trans>
        </Button>
      }
    />
  );
}

function GlvGmxRecommendedAssetItem({
  glvOrMarketInfo,
  feeApy,
}: {
  glvOrMarketInfo: GlvOrMarketInfo;
  feeApy: bigint | undefined;
}) {
  const iconTokenSymbol = isGlvInfo(glvOrMarketInfo)
    ? "GLV"
    : glvOrMarketInfo.isSpotOnly
      ? getNormalizedTokenSymbol(glvOrMarketInfo.longToken.symbol) +
        getNormalizedTokenSymbol(glvOrMarketInfo.shortToken.symbol)
      : getNormalizedTokenSymbol(glvOrMarketInfo.indexToken.symbol);

  return (
    <BaseRecommendedAssetItem
      icon={
        <TokenIcon
          symbol={iconTokenSymbol}
          displaySize={32}
          importSize={40}
          className={cx({ "!rounded-0": isGlvInfo(glvOrMarketInfo) })}
        />
      }
      title={getMarketIndexName(glvOrMarketInfo)}
      subtitle={`[${getMarketPoolName(glvOrMarketInfo)}]`}
      metricValue={formatPercentage(feeApy, { bps: false })}
      metricLabel={<Trans>Fee APY</Trans>}
      button={
        <Button variant="primary" to={`/pools/details?market=${getGlvOrMarketAddress(glvOrMarketInfo)}`}>
          <Trans>Earn</Trans>
        </Button>
      }
    />
  );
}

function BaseRecommendedAssetItem({
  icon,
  title,
  subtitle,
  metricValue,
  metricLabel,
  button,
}: {
  icon: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  metricValue: ReactNode;
  metricLabel: ReactNode;
  button: ReactNode;
}) {
  return (
    <div className="flex grow items-center justify-between gap-4 rounded-8 border-1/2 border-slate-600 bg-slate-950/50 p-12">
      <div className="flex gap-16">
        <div className="flex items-center gap-12">
          {icon}
          <div className="flex flex-col gap-2">
            <span className="text-body-medium font-medium text-typography-primary">{title}</span>
            {subtitle ? <span className="text-body-small text-typography-secondary">{subtitle}</span> : null}
          </div>
        </div>
        <div className="border-r-1/2 border-slate-600" />
        <div className="flex flex-col gap-2">
          <span className="text-body-medium font-medium text-typography-primary">{metricValue}</span>
          <span className="text-body-small text-typography-secondary">{metricLabel}</span>
        </div>
      </div>
      {button}
    </div>
  );
}
