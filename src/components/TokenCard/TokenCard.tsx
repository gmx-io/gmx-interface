import { Trans } from "@lingui/macro";
import cx from "classnames";
import keys from "lodash/keys";
import uniq from "lodash/uniq";
import { useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useMedia } from "react-use";

import { ARBITRUM, AVALANCHE, BOTANIX } from "config/chains";
import { getIcon } from "config/icons";
import { getIncentivesV2Url } from "config/links";
import useIncentiveStats from "domain/synthetics/common/useIncentiveStats";
import { isGlvEnabled } from "domain/synthetics/markets/glv";
import type { MarketTokensAPRData } from "domain/synthetics/markets/types";
import { GlvList, useGlvMarketsInfo } from "domain/synthetics/markets/useGlvMarkets";
import { useGmMarketsApy } from "domain/synthetics/markets/useGmMarketsApy";
import { useChainId } from "lib/chains";
import { isHomeSite } from "lib/legacy";
import { formatAmount } from "lib/numbers";
import { RawIncentivesStats } from "lib/oracleKeeperFetcher";
import { userAnalytics } from "lib/userAnalytics";
import { LandingPageProtocolReadMoreEvent, LandingPageProtocolTokenEvent } from "lib/userAnalytics/types";
import { switchNetwork } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";

import APRLabel from "components/APRLabel/APRLabel";
import BannerButton from "components/Banner/BannerButton";
import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { HeaderLink } from "components/Header/HeaderLink";
import { TrackingLink } from "components/TrackingLink/TrackingLink";

import ArbitrumIcon from "img/ic_arbitrum_24.svg?react";
import AvalancheIcon from "img/ic_avalanche_24.svg?react";
import BotanixIcon from "img/ic_botanix_24.svg?react";
import sparkleIcon from "img/sparkle.svg";

const glpIcon = getIcon("common", "glp");
const gmxIcon = getIcon("common", "gmx");
const gmIcon = getIcon("common", "gm");
const glvIcon = getIcon("common", "glv");

const networkIcons = {
  [ARBITRUM]: ArbitrumIcon,
  [AVALANCHE]: AvalancheIcon,
  [BOTANIX]: BotanixIcon,
};

function calculateMaxApr(apr: MarketTokensAPRData, incentiveApr: MarketTokensAPRData) {
  const allKeys = uniq(keys(apr).concat(keys(incentiveApr)));

  let maxApr = 0n;

  for (const key of allKeys) {
    let aprValue = 0n;
    aprValue = apr[key] ?? 0n;

    const incentiveAprValue = incentiveApr[key] ?? 0n;
    const totalApr = aprValue + incentiveAprValue;

    if (totalApr > maxApr) {
      maxApr = totalApr;
    }
  }

  return maxApr;
}

const hasGlvRewards = (stats: RawIncentivesStats | null, glvs: GlvList | undefined) =>
  stats?.lp?.isActive &&
  Object.entries(stats?.lp.rewardsPerMarket ?? {}).some(([market, reward]) => {
    return Object.values(glvs ?? {}).some(({ glv }) => glv.glvToken === market && BigInt(reward) > 0n);
  });

type Props = {
  showRedirectModal?: (to: string) => void;
};

const BuyLink = ({
  chainId,
  active,
  to,
  children,
  network,
  showRedirectModal,
  trackLinkHandler,
}: {
  chainId: number;
  active: boolean;
  to: string;
  children: React.ReactNode;
  network: number;
  showRedirectModal: undefined | ((to: string) => void);
  trackLinkHandler?: () => void | Promise<void>;
}) => {
  const changeNetwork = useCallback(
    (network) => {
      if (network === chainId) {
        return;
      }
      if (!active) {
        // wait until the internal navigation is done
        setTimeout(() => {
          return switchNetwork(network, active);
        }, 500);
      } else {
        return switchNetwork(network, active);
      }
    },
    [chainId, active]
  );

  const Icon = networkIcons[network];
  const className = `flex cursor-pointer justify-center gap-8 rounded-3 text-white bg-slate-700
        px-16 py-10 leading-[1.4em] hover:bg-cold-blue-700 active:bg-cold-blue-500`;

  const isHome = isHomeSite();
  if (isHome && showRedirectModal) {
    return (
      <HeaderLink onClick={trackLinkHandler} to={to} className={className} showRedirectModal={showRedirectModal}>
        <Icon className="h-20 w-20" />
        {children}
      </HeaderLink>
    );
  }

  const LinkComponent = (
    <Link to={to} className={className} onClick={() => changeNetwork(network)}>
      <Icon className="h-20 w-20" />
      {children}
    </Link>
  );

  return trackLinkHandler && isHome ? (
    <TrackingLink onClick={trackLinkHandler}>{LinkComponent}</TrackingLink>
  ) : (
    LinkComponent
  );
};

async function sendUserAnalyticsProtocolTokenEvent(
  chain: LandingPageProtocolTokenEvent["data"]["chain"],
  type: LandingPageProtocolTokenEvent["data"]["type"]
) {
  await userAnalytics.pushEvent<LandingPageProtocolTokenEvent>(
    {
      event: "LandingPageAction",
      data: {
        action: "ProtocolTokenAction",
        chain,
        type,
      },
    },
    { instantSend: true }
  );
}

const trackGMXBuyArbitrum = () => sendUserAnalyticsProtocolTokenEvent("Arbitrum", "GMX");
const trackGMXBuyAvalanche = () => sendUserAnalyticsProtocolTokenEvent("Avalanche", "GMX");
const trackGLPBuyArbitrum = () => sendUserAnalyticsProtocolTokenEvent("Arbitrum", "GLP");
const trackGLPBuyAvalanche = () => sendUserAnalyticsProtocolTokenEvent("Avalanche", "GLP");
const trackGLVBuyArbitrum = () => sendUserAnalyticsProtocolTokenEvent("Arbitrum", "GLV");
const trackGLVBuyAvalanche = () => sendUserAnalyticsProtocolTokenEvent("Avalanche", "GLV");
const trackGLVBuyBotanix = () => sendUserAnalyticsProtocolTokenEvent("Botanix", "GLV");
const trackGMBuyArbitrum = () => sendUserAnalyticsProtocolTokenEvent("Arbitrum", "GM");
const trackGMBuyAvalanche = () => sendUserAnalyticsProtocolTokenEvent("Avalanche", "GM");
const trackGMBuyBotanix = () => sendUserAnalyticsProtocolTokenEvent("Botanix", "GM");

function getTrackingLink(link: string) {
  if (!isHomeSite()) {
    return link;
  }

  const paramsPrefix = link.includes("?") ? "&" : "?";

  return `${link}${paramsPrefix}${userAnalytics.getSessionIdUrlParams()}`;
}

async function sendUserAnalyticsProtocolReadMoreEvent() {
  if (isHomeSite()) {
    await userAnalytics.pushEvent<LandingPageProtocolReadMoreEvent>(
      { event: "LandingPageAction", data: { action: "ProtocolReadMore" } },
      { instantSend: true }
    );
  }
}

const PERIOD = "90d";

export default function TokenCard({ showRedirectModal }: Props) {
  const { chainId } = useChainId();
  const { active, account } = useWallet();
  const arbitrumIncentiveState = useIncentiveStats(ARBITRUM);
  const avalancheIncentiveState = useIncentiveStats(AVALANCHE);

  const { glvs: glvArb } = useGlvMarketsInfo(isGlvEnabled(ARBITRUM), {
    chainId: ARBITRUM,
    account,
    marketsInfoData: undefined,
    tokensData: undefined,
  });

  const { glvs: glvAvax } = useGlvMarketsInfo(isGlvEnabled(AVALANCHE), {
    chainId: AVALANCHE,
    marketsInfoData: undefined,
    tokensData: undefined,
    account,
  });

  const {
    marketsTokensApyData: arbApy,
    marketsTokensIncentiveAprData: arbIncentiveApr,
    glvTokensIncentiveAprData: arbGlvIncentiveApr,
    glvApyInfoData: arbGlvApy,
  } = useGmMarketsApy(ARBITRUM, { period: PERIOD });
  const {
    marketsTokensApyData: avaxApy,
    marketsTokensIncentiveAprData: avaxIncentiveApr,
    glvTokensIncentiveAprData: avaxGlvIncentiveApr,
    glvApyInfoData: avaxGlvApy,
  } = useGmMarketsApy(AVALANCHE, { period: PERIOD });

  const maxMarketApyText = useMemo(() => {
    if (!arbApy || !arbIncentiveApr || !avaxApy || !avaxIncentiveApr)
      return {
        [ARBITRUM]: "...%",
        [AVALANCHE]: "...%",
      };

    const maxArbApy = calculateMaxApr(arbApy, arbIncentiveApr);
    const maxAvaxApy = calculateMaxApr(avaxApy, avaxIncentiveApr);

    return {
      [ARBITRUM]: `${formatAmount(maxArbApy, 28, 2)}%`,
      [AVALANCHE]: `${formatAmount(maxAvaxApy, 28, 2)}%`,
    };
  }, [arbApy, arbIncentiveApr, avaxApy, avaxIncentiveApr]);

  const maxGlvApyText = useMemo(() => {
    const arb = !arbGlvApy ? "...%" : `${formatAmount(calculateMaxApr(arbGlvApy, arbGlvIncentiveApr ?? {}), 28, 2)}%`;
    const avax = !avaxGlvApy
      ? "...%"
      : `${formatAmount(calculateMaxApr(avaxGlvApy, avaxGlvIncentiveApr ?? {}), 28, 2)}%`;
    return {
      [ARBITRUM]: isGlvEnabled(ARBITRUM) ? arb : undefined,
      [AVALANCHE]: isGlvEnabled(AVALANCHE) ? avax : undefined,
    };
  }, [arbGlvApy, avaxGlvApy, arbGlvIncentiveApr, avaxGlvIncentiveApr]);

  const poolsIncentivizedLabel = useMemo(() => {
    const sparkle = <img src={sparkleIcon} alt="sparkle" className="relative -top-2 -mr-10 inline h-10 align-top" />;
    const avalancheLink = <ExternalLink href={getIncentivesV2Url(AVALANCHE)}>Avalanche</ExternalLink>;

    if (avalancheIncentiveState?.lp?.isActive) {
      return (
        <Trans>
          {avalancheLink} GM Pools are <span className="whitespace-nowrap">incentivized{sparkle}.</span>
        </Trans>
      );
    } else {
      return null;
    }
  }, [avalancheIncentiveState?.lp?.isActive]);

  const glvsIncentivizedLabel = useMemo(() => {
    const sparkle = <img src={sparkleIcon} alt="sparkle" className="relative -top-2 -mr-10 inline h-10 align-top" />;
    const arbitrumLink = <ExternalLink href={getIncentivesV2Url(ARBITRUM)}>Arbitrum</ExternalLink>;
    const avalancheLink = <ExternalLink href={getIncentivesV2Url(AVALANCHE)}>Avalanche</ExternalLink>;

    const hasArbitrumGlvIncentives = hasGlvRewards(arbitrumIncentiveState, glvArb);
    const hasAvaxGlvIncentives = hasGlvRewards(avalancheIncentiveState, glvAvax);

    if (hasArbitrumGlvIncentives && hasAvaxGlvIncentives) {
      return (
        <Trans>
          {arbitrumLink} and {avalancheLink} GLV Pools are{" "}
          <span className="whitespace-nowrap">incentivized{sparkle}.</span>
        </Trans>
      );
    } else if (hasArbitrumGlvIncentives) {
      return (
        <Trans>
          {arbitrumLink} GLV Pools are <span className="whitespace-nowrap">incentivized{sparkle}.</span>
        </Trans>
      );
    } else if (hasAvaxGlvIncentives) {
      return (
        <Trans>
          {avalancheLink} GLV Pools are <span className="whitespace-nowrap">incentivized{sparkle}.</span>
        </Trans>
      );
    } else {
      return null;
    }
  }, [glvArb, glvAvax, arbitrumIncentiveState, avalancheIncentiveState]);

  const isMobile = useMedia("(max-width: 1000px)");

  return (
    <div className="Home-token-card-options">
      <div className="Home-token-card-option">
        <div>
          <div className="Home-token-card-option-icon">
            <img src={gmxIcon} width="40" alt="GMX Icons" /> GMX
          </div>
          <div className="Home-token-card-option-info">
            <div className="Home-token-card-option-title">
              <Trans>
                GMX is the utility and governance token. Accrues 30% and 27% of V1 and V2 markets generated fees,
                respectively.
              </Trans>
            </div>
            <div className="Home-token-card-option-apr">
              <Trans>Arbitrum APR:</Trans> <APRLabel chainId={ARBITRUM} label="avgGMXAprTotal" />,{" "}
              <Trans>Avalanche APR:</Trans> <APRLabel chainId={AVALANCHE} label="avgGMXAprTotal" />
            </div>
          </div>
        </div>
        <div className="mt-50 flex flex-col gap-15 text-slate-100">
          <Trans>Buy token on:</Trans>
          <div className={cx("flex justify-between", { "flex-col gap-15": isMobile })}>
            <div className={cx("buy flex gap-15", { "flex-col": isMobile })}>
              <BuyLink
                chainId={chainId}
                active={active}
                to={getTrackingLink("/buy_gmx")}
                network={ARBITRUM}
                showRedirectModal={showRedirectModal}
                trackLinkHandler={trackGMXBuyArbitrum}
              >
                <Trans>Arbitrum</Trans>
              </BuyLink>
              <BuyLink
                chainId={chainId}
                active={active}
                to={getTrackingLink("/buy_gmx")}
                network={AVALANCHE}
                showRedirectModal={showRedirectModal}
                trackLinkHandler={trackGMXBuyAvalanche}
              >
                <Trans>Avalanche</Trans>
              </BuyLink>
            </div>
            <TrackingLink onClick={sendUserAnalyticsProtocolReadMoreEvent}>
              <Button
                className="!py-11 tracking-normal"
                newTab
                variant="secondary"
                to="https://docs.gmx.io/docs/category/tokenomics"
              >
                <Trans>Read more</Trans>
              </Button>
            </TrackingLink>
          </div>
        </div>
      </div>
      <div className="Home-token-card-option">
        <div>
          <div className="Home-token-card-option-icon">
            <img src={glvIcon} alt="GLV icon" /> GLV
          </div>
          <div className="Home-token-card-option-info">
            <div className="Home-token-card-option-title">
              <Trans>
                GLV is the liquidity provider token for GMX V2 vaults. Consist of several GM tokens and accrues fees
                generated by them.
              </Trans>
            </div>
          </div>
          {glvsIncentivizedLabel && (
            <div className="text-body-large mt-15 rounded-4 bg-cold-blue-900 px-15 py-8">{glvsIncentivizedLabel}</div>
          )}
          <div className="Home-token-card-option-apr">
            <Trans>Arbitrum Max. APY:</Trans> {maxGlvApyText?.[ARBITRUM]}
            {maxGlvApyText?.[AVALANCHE] && (
              <>
                , <Trans>Avalanche Max. APY: {maxGlvApyText?.[AVALANCHE]}</Trans>
              </>
            )}
          </div>
        </div>

        <div className="mt-50 flex flex-col gap-15 text-slate-100">
          <Trans>Buy token on:</Trans>
          <div className={cx("flex justify-between", { "flex-col gap-15": isMobile })}>
            <div className={cx("buy flex gap-15", { "flex-col": isMobile })}>
              <BuyLink
                to={getTrackingLink("/pools?pickBestGlv=1")}
                network={ARBITRUM}
                chainId={chainId}
                active={active}
                showRedirectModal={showRedirectModal}
                trackLinkHandler={trackGLVBuyArbitrum}
              >
                <Trans>Arbitrum</Trans>
              </BuyLink>

              {isGlvEnabled(AVALANCHE) && (
                <BuyLink
                  to={getTrackingLink("/pools?pickBestGlv=1")}
                  network={AVALANCHE}
                  chainId={chainId}
                  active={active}
                  showRedirectModal={showRedirectModal}
                  trackLinkHandler={trackGLVBuyAvalanche}
                >
                  <Trans>Avalanche</Trans>
                </BuyLink>
              )}

              <BuyLink
                to={getTrackingLink("/pools?pickBestGlv=1")}
                network={BOTANIX}
                chainId={chainId}
                active={active}
                showRedirectModal={showRedirectModal}
                trackLinkHandler={trackGLVBuyBotanix}
              >
                <Trans>Botanix</Trans>
              </BuyLink>
            </div>
            <TrackingLink onClick={sendUserAnalyticsProtocolReadMoreEvent}>
              <Button
                className="!py-11 tracking-normal"
                newTab
                variant="secondary"
                to="https://docs.gmx.io/docs/providing-liquidity/v2/#glv-pools"
              >
                <Trans>Read more</Trans>
              </Button>
            </TrackingLink>
          </div>
        </div>
      </div>
      <div className="Home-token-card-option">
        <div>
          <div className="Home-token-card-option-icon">
            <img src={gmIcon} alt="gmxBigIcon" /> GM
          </div>
          <div className="Home-token-card-option-info">
            <div className="Home-token-card-option-title">
              <Trans>
                GM is the liquidity provider token for GMX V2 markets. Accrues 63% of the V2 markets generated fees.
              </Trans>
            </div>
          </div>
          {poolsIncentivizedLabel && (
            <div className="text-body-large mt-15 rounded-4 bg-cold-blue-900 px-15 py-8">{poolsIncentivizedLabel}</div>
          )}
          <div className="Home-token-card-option-apr">
            <Trans>Arbitrum Max. APY:</Trans> {maxMarketApyText?.[ARBITRUM]},{" "}
            <Trans>Avalanche Max. APY: {maxMarketApyText?.[AVALANCHE]}</Trans>{" "}
          </div>
        </div>

        <div className="mt-50 flex flex-col gap-15 text-slate-100">
          <Trans>Buy token on:</Trans>
          <div className={cx("flex justify-between", { "flex-col gap-15": isMobile })}>
            <div className={cx("buy flex gap-15", { "flex-col": isMobile })}>
              <BuyLink
                to={getTrackingLink("/pools")}
                network={ARBITRUM}
                chainId={chainId}
                active={active}
                showRedirectModal={showRedirectModal}
                trackLinkHandler={trackGMBuyArbitrum}
              >
                <Trans>Arbitrum</Trans>
              </BuyLink>

              <BuyLink
                to={getTrackingLink("/pools")}
                network={AVALANCHE}
                chainId={chainId}
                active={active}
                showRedirectModal={showRedirectModal}
                trackLinkHandler={trackGMBuyAvalanche}
              >
                <Trans>Avalanche</Trans>
              </BuyLink>

              <BuyLink
                to={getTrackingLink("/pools")}
                network={BOTANIX}
                chainId={chainId}
                active={active}
                showRedirectModal={showRedirectModal}
                trackLinkHandler={trackGMBuyBotanix}
              >
                <Trans>Botanix</Trans>
              </BuyLink>
            </div>
            <TrackingLink onClick={sendUserAnalyticsProtocolReadMoreEvent}>
              <Button
                className="!py-11 tracking-normal"
                newTab
                variant="secondary"
                to="https://docs.gmx.io/docs/providing-liquidity/v2"
              >
                <Trans>Read more</Trans>
              </Button>
            </TrackingLink>
          </div>
        </div>
      </div>
      <div className="Home-token-card-option">
        <div>
          <div className="Home-token-card-option-icon">
            <img src={glpIcon} width="40" alt="GLP Icon" /> GLP
          </div>
          <div className="Home-token-card-option-info">
            <div className="Home-token-card-option-title">
              <Trans>
                GLP is the liquidity provider token for GMX V1 markets. Accrues 70% of the V1 markets generated fees.
              </Trans>
              {arbitrumIncentiveState?.migration?.isActive && (
                <BannerButton
                  className="mt-15"
                  label="Migrating from GLP to GM is incentivized in Arbitrum."
                  link={getIncentivesV2Url(ARBITRUM)}
                />
              )}
            </div>
            <div className="Home-token-card-option-apr">
              <Trans>Arbitrum APR:</Trans> <APRLabel chainId={ARBITRUM} label="glpAprTotal" key="ARBITRUM" />,{" "}
              <Trans>Avalanche APR:</Trans> <APRLabel chainId={AVALANCHE} label="glpAprTotal" key="AVALANCHE" />
            </div>
          </div>
        </div>
        <div className="mt-50 flex flex-col gap-15 text-slate-100">
          <Trans>Buy token on:</Trans>
          <div className={cx("flex justify-between", { "flex-col gap-15": isMobile })}>
            <div className={cx("buy flex gap-15", { "flex-col": isMobile })}>
              <BuyLink
                to={getTrackingLink("/buy_glp")}
                network={ARBITRUM}
                chainId={chainId}
                active={active}
                showRedirectModal={showRedirectModal}
                trackLinkHandler={trackGLPBuyArbitrum}
              >
                <Trans>Arbitrum</Trans>
              </BuyLink>
              <BuyLink
                to={getTrackingLink("/buy_glp")}
                network={AVALANCHE}
                chainId={chainId}
                active={active}
                showRedirectModal={showRedirectModal}
                trackLinkHandler={trackGLPBuyAvalanche}
              >
                <Trans>Avalanche</Trans>
              </BuyLink>
            </div>
            <TrackingLink onClick={sendUserAnalyticsProtocolReadMoreEvent}>
              <Button
                className="!py-11 tracking-normal"
                newTab
                variant="secondary"
                to="https://docs.gmx.io/docs/providing-liquidity/v1"
              >
                <Trans>Read more</Trans>
              </Button>
            </TrackingLink>
          </div>
        </div>
      </div>
    </div>
  );
}
