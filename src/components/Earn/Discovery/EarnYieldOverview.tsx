import { Trans } from "@lingui/macro";
import cx from "classnames";
import uniq from "lodash/uniq";
import { ReactNode, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAccount } from "wagmi";

import { ARBITRUM, AVALANCHE, BOTANIX } from "config/chains";
import { getChainIcon, getIcon } from "config/icons";
import type { MarketTokensAPRData } from "domain/synthetics/markets/types";
import { useGmMarketsApy } from "domain/synthetics/markets/useGmMarketsApy";
import { useTokensDataRequest } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { defined } from "lib/guards";
import { formatPercentage } from "lib/numbers";
import { useBreakpoints } from "lib/useBreakpoints";
import { sendEarnRecommendationClickedEvent } from "lib/userAnalytics";
import { switchNetwork } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";

import APRLabel from "components/APRLabel/APRLabel";
import Tabs from "components/Tabs/Tabs";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import ChevronRightIcon from "img/ic_chevron_right.svg?react";
import glvIcon from "img/ic_glv_24.svg";
import gmIcon from "img/ic_gm_24.svg";
import gmxIcon from "img/ic_gmx_24.svg";

const PERIOD = "90d";

function hasTokenBalance(tokensData: ReturnType<typeof useTokensDataRequest>["tokensData"], symbol: string) {
  if (!tokensData) {
    return false;
  }

  return Object.values(tokensData).some((token) => {
    if (token.symbol !== symbol) {
      return false;
    }

    return token.balance !== undefined && token.balance > 0n;
  });
}

function calculateMaxApr(
  base?: MarketTokensAPRData,
  ...extra: (MarketTokensAPRData | undefined)[]
): bigint | undefined {
  const sources = [base, ...extra].filter(defined);

  if (!sources.length) {
    return undefined;
  }

  const keys = uniq(sources.flatMap((item) => Object.keys(item)));
  let maxValue: bigint | undefined;

  for (const key of keys) {
    const total = sources.reduce((acc, item) => acc + (item[key] ?? 0n), 0n);

    if (maxValue === undefined || total > maxValue) {
      maxValue = total;
    }
  }

  return maxValue;
}

function formatAprValue(value: bigint | undefined) {
  if (value === undefined) {
    return "...%";
  }

  return formatPercentage(value, { bps: false });
}

function YieldMetric({
  value,
  suffix,
  tooltip,
  disabled,
}: {
  value: ReactNode;
  suffix: string;
  tooltip?: ReactNode;
  disabled?: boolean;
}) {
  const metricNode = (
    <div className="flex items-center gap-6 text-13">
      <span className={cx("text-typography-primary", { "group-hover:text-blue-300": !disabled })}>{value}</span>
      {!disabled && <span className="uppercase text-typography-secondary">{suffix}</span>}
    </div>
  );

  if (!tooltip) {
    return metricNode;
  }

  return <TooltipWithPortal handle={metricNode} content={tooltip} position="top" />;
}

type YieldRowProps = {
  token: "GMX" | "GLV" | "GM";
  metric: ReactNode;
  to?: string;
  disabled?: boolean;
  chainId?: number;
};

const ASSET_ICONS: Record<YieldRowProps["token"], string> = {
  GMX: gmxIcon,
  GLV: glvIcon,
  GM: gmIcon,
};

function NetworkYieldCard({
  chainId,
  title,
  children,
  showTitle,
}: {
  chainId: number;
  title: ReactNode;
  children: ReactNode;
  showTitle?: boolean;
}) {
  return (
    <div className="flex flex-col gap-8 rounded-8 bg-slate-900 p-16 max-xl:p-0">
      {showTitle && (
        <div className="flex items-center gap-8 pl-12 text-13 font-medium text-typography-primary">
          <img src={getIcon(chainId, "network")} alt="network" className="h-20 w-20" />
          {title}
        </div>
      )}

      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function YieldRow({ token, metric, to, disabled, chainId: targetChainId }: YieldRowProps) {
  const { chainId: currentChainId } = useChainId();
  const { active } = useWallet();

  const changeNetwork = () => {
    if (!targetChainId || targetChainId === currentChainId) {
      return;
    }

    if (!active) {
      setTimeout(() => {
        void switchNetwork(targetChainId, active);
      }, 500);
    } else {
      void switchNetwork(targetChainId, active);
    }
  };

  const handleClick = () => {
    sendEarnRecommendationClickedEvent({
      activeTab: "discover",
      context: "YieldLandscape",
      token,
    });

    changeNetwork();
  };

  const className = cx(
    "group flex items-center justify-between gap-8 border-b-1/2 border-slate-600 px-12 py-8 last:border-b-0",
    {
      "cursor-default": disabled,
    }
  );

  const content = (
    <>
      <div className="flex items-center gap-8">
        <img className="size-20" src={ASSET_ICONS[token]} alt={token} />
        <span className="text-13 font-medium text-typography-primary">{token}</span>
      </div>

      <div className="flex items-center gap-8">
        {metric}
        {!disabled && (
          <ChevronRightIcon
            className={cx("size-16 text-typography-secondary", { "group-hover:text-blue-300": !disabled })}
          />
        )}
      </div>
    </>
  );

  if (disabled || !to) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Link to={to} className={className} onClick={handleClick}>
      {content}
    </Link>
  );
}

const CHAINS_ORDER = [ARBITRUM, AVALANCHE, BOTANIX];

export default function EarnYieldOverview() {
  const { address: account } = useAccount();
  const { isDesktop: isTabsMode } = useBreakpoints();

  const arbitrumTokens = useTokensDataRequest(ARBITRUM);
  const avalancheTokens = useTokensDataRequest(AVALANCHE);
  const botanixTokens = useTokensDataRequest(BOTANIX);

  const [mobileChainId, setMobileChainId] = useState<number>(ARBITRUM);

  const hasGmxHoldings = useMemo(
    () =>
      hasTokenBalance(arbitrumTokens.tokensData, "GMX") ||
      hasTokenBalance(avalancheTokens.tokensData, "GMX") ||
      hasTokenBalance(botanixTokens.tokensData, "GMX"),
    [arbitrumTokens.tokensData, avalancheTokens.tokensData, botanixTokens.tokensData]
  );

  const gmxLink = account && hasGmxHoldings ? "/earn/portfolio" : "/buy";
  const poolsLink = "/pools";

  const { glvApyInfoData: arbGlvApy, marketsTokensApyData: arbGmApy } = useGmMarketsApy(ARBITRUM, undefined, {
    period: PERIOD,
  });

  const { glvApyInfoData: avaxGlvApy, marketsTokensApyData: avaxGmApy } = useGmMarketsApy(AVALANCHE, undefined, {
    period: PERIOD,
  });

  const { marketsTokensApyData: botanixGmApy } = useGmMarketsApy(BOTANIX, undefined, { period: PERIOD });

  const arbMaxGlv = useMemo(() => calculateMaxApr(arbGlvApy), [arbGlvApy]);
  const arbMaxGm = useMemo(() => calculateMaxApr(arbGmApy), [arbGmApy]);

  const avaxMaxGlv = useMemo(() => calculateMaxApr(avaxGlvApy), [avaxGlvApy]);
  const avaxMaxGm = useMemo(() => calculateMaxApr(avaxGmApy), [avaxGmApy]);

  const botanixMaxGm = useMemo(() => calculateMaxApr(botanixGmApy), [botanixGmApy]);

  const networkCards = useMemo(
    () => ({
      [ARBITRUM]: {
        chainId: ARBITRUM,
        title: <Trans>Arbitrum</Trans>,
        rows: [
          <YieldRow
            key="arb-gmx"
            token="GMX"
            to={gmxLink}
            chainId={ARBITRUM}
            metric={<YieldMetric value={<APRLabel chainId={ARBITRUM} label="avgGMXAprTotal" />} suffix="APR" />}
          />,
          <YieldRow
            key="arb-glv"
            token="GLV"
            to={poolsLink}
            chainId={ARBITRUM}
            metric={<YieldMetric value={formatAprValue(arbMaxGlv)} suffix="APY" />}
          />,
          <YieldRow
            key="arb-gm"
            token="GM"
            to={poolsLink}
            chainId={ARBITRUM}
            metric={<YieldMetric value={formatAprValue(arbMaxGm)} suffix="APY" />}
          />,
        ],
      },
      [AVALANCHE]: {
        chainId: AVALANCHE,
        title: <Trans>Avalanche</Trans>,
        rows: [
          <YieldRow
            key="avax-gmx"
            token="GMX"
            to={gmxLink}
            chainId={AVALANCHE}
            metric={<YieldMetric value={<APRLabel chainId={AVALANCHE} label="avgGMXAprTotal" />} suffix="APR" />}
          />,
          <YieldRow
            key="avax-glv"
            token="GLV"
            to={poolsLink}
            chainId={AVALANCHE}
            metric={<YieldMetric value={formatAprValue(avaxMaxGlv)} suffix="APY" />}
          />,
          <YieldRow
            key="avax-gm"
            token="GM"
            to={poolsLink}
            chainId={AVALANCHE}
            metric={<YieldMetric value={formatAprValue(avaxMaxGm)} suffix="APY" />}
          />,
        ],
      },
      [BOTANIX]: {
        chainId: BOTANIX,
        title: <Trans>Botanix</Trans>,
        rows: [
          <YieldRow
            key="botanix-gmx"
            token="GMX"
            disabled
            chainId={BOTANIX}
            metric={
              <YieldMetric
                value={<Trans>N/A</Trans>}
                suffix="APR"
                tooltip={<Trans>GMX staking isn't currently supported on Botanix.</Trans>}
              />
            }
          />,
          <YieldRow
            key="botanix-glv"
            token="GLV"
            disabled
            chainId={BOTANIX}
            metric={
              <YieldMetric
                value={<Trans>N/A</Trans>}
                suffix="APY"
                tooltip={<Trans>No GLV vaults are currently active on Botanix.</Trans>}
              />
            }
          />,
          <YieldRow
            key="botanix-gm"
            token="GM"
            to={poolsLink}
            chainId={BOTANIX}
            metric={<YieldMetric value={formatAprValue(botanixMaxGm)} suffix="APY" />}
          />,
        ],
      },
    }),
    [arbMaxGlv, arbMaxGm, avaxMaxGlv, avaxMaxGm, botanixMaxGm, gmxLink, poolsLink]
  );

  const tabs = useMemo(
    () =>
      CHAINS_ORDER.map((chainId) => networkCards[chainId]).map((card) => ({
        value: card.chainId,
        label: (
          <>
            <img src={getChainIcon(card.chainId)} className="size-16" /> {card.title}
          </>
        ),
      })),
    [networkCards]
  );

  const selectedCard = useMemo(
    () => networkCards[mobileChainId] ?? networkCards[ARBITRUM],
    [mobileChainId, networkCards]
  );

  return (
    <div className="flex flex-col max-xl:rounded-8 max-xl:bg-slate-900 max-xl:p-16">
      <h4 className="py-20 text-20 font-medium text-typography-primary max-xl:pb-12 max-xl:pt-0">
        <Trans>Current Yield Landscape</Trans>
      </h4>

      {isTabsMode ? (
        <div className="flex flex-col">
          <Tabs
            options={tabs}
            selectedValue={mobileChainId}
            onChange={setMobileChainId}
            type="inline"
            regularOptionClassname="grow"
          />

          <NetworkYieldCard chainId={selectedCard.chainId} title={selectedCard.title}>
            {selectedCard.rows}
          </NetworkYieldCard>
        </div>
      ) : (
        <div className="grid gap-12 lg:grid-cols-3">
          {CHAINS_ORDER.map((chainId) => networkCards[chainId]).map((card) => (
            <NetworkYieldCard key={card.chainId} chainId={card.chainId} title={card.title} showTitle={true}>
              {card.rows}
            </NetworkYieldCard>
          ))}
        </div>
      )}
    </div>
  );
}
