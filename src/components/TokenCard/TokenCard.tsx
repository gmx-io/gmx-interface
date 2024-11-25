import { Trans } from "@lingui/macro";
import keys from "lodash/keys";
import uniq from "lodash/uniq";
import { useCallback, useMemo } from "react";
import { Link } from "react-router-dom";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { getIcon } from "config/icons";
import { getIncentivesV2Url } from "config/links";
import { getMarketListingDate } from "config/markets";
import useIncentiveStats from "domain/synthetics/common/useIncentiveStats";
import { getIsBaseApyReadyToBeShown } from "domain/synthetics/markets/getIsBaseApyReadyToBeShown";
import type { MarketTokensAPRData } from "domain/synthetics/markets/types";
import { useGmMarketsApy } from "domain/synthetics/markets/useGmMarketsApy";
import { useChainId } from "lib/chains";
import { isHomeSite } from "lib/legacy";
import { formatAmount } from "lib/numbers";
import { switchNetwork } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";

import BannerButton from "components/Banner/BannerButton";
import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import APRLabel from "../APRLabel/APRLabel";
import { HeaderLink } from "../Header/HeaderLink";

import sparkleIcon from "img/sparkle.svg";
import { GlvList, useGlvMarketsInfo } from "domain/synthetics/markets/useGlvMarkets";
import { isGlvEnabled } from "domain/synthetics/markets/glv";
import { RawIncentivesStats } from "lib/oracleKeeperFetcher";

const glpIcon = getIcon("common", "glp");
const gmxIcon = getIcon("common", "gmx");
const gmIcon = getIcon("common", "gm");
const glvIcon = getIcon("common", "glv");

function calculateMaxApr(apr: MarketTokensAPRData, incentiveApr: MarketTokensAPRData, chainId?: number) {
  const allKeys = uniq(keys(apr).concat(keys(incentiveApr)));

  let maxApr = 0n;

  for (const key of allKeys) {
    const isBaseApyReadyToBeShown = chainId ? getIsBaseApyReadyToBeShown(getMarketListingDate(chainId, key)) : true;

    let aprValue = 0n;
    if (isBaseApyReadyToBeShown) {
      aprValue = apr[key] ?? 0n;
    }

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
  className,
  to,
  children,
  network,
  showRedirectModal,
}: {
  chainId: number;
  active: boolean;
  className: string;
  to: string;
  children: React.ReactNode;
  network: number;
  showRedirectModal: undefined | ((to: string) => void);
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

  const isHome = isHomeSite();
  if (isHome && showRedirectModal) {
    return (
      <HeaderLink to={to} className={className} showRedirectModal={showRedirectModal}>
        {children}
      </HeaderLink>
    );
  }

  return (
    <Link to={to} className={className} onClick={() => changeNetwork(network)}>
      {children}
    </Link>
  );
};

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
    filterIncorrectMarkets: false,
  });

  const { glvs: glvAvax } = useGlvMarketsInfo(isGlvEnabled(AVALANCHE), {
    chainId: AVALANCHE,
    marketsInfoData: undefined,
    tokensData: undefined,
    account,
    filterIncorrectMarkets: false,
  });

  const {
    marketsTokensApyData: arbApy,
    marketsTokensIncentiveAprData: arbIncentiveApr,
    glvTokensIncentiveAprData: arbGlvIncentiveApr,
    glvApyInfoData: arbGlvApy,
  } = useGmMarketsApy(ARBITRUM);
  const {
    marketsTokensApyData: avaxApy,
    marketsTokensIncentiveAprData: avaxIncentiveApr,
    glvTokensIncentiveAprData: avaxGlvIncentiveApr,
    glvApyInfoData: avaxGlvApy,
  } = useGmMarketsApy(AVALANCHE);

  const maxMarketApyText = useMemo(() => {
    if (!arbApy || !arbIncentiveApr || !avaxApy || !avaxIncentiveApr)
      return {
        [ARBITRUM]: "...%",
        [AVALANCHE]: "...%",
      };

    const maxArbApy = calculateMaxApr(arbApy, arbIncentiveApr, ARBITRUM);
    const maxAvaxApy = calculateMaxApr(avaxApy, avaxIncentiveApr, AVALANCHE);

    return {
      [ARBITRUM]: `${formatAmount(maxArbApy, 28, 2)}%`,
      [AVALANCHE]: `${formatAmount(maxAvaxApy, 28, 2)}%`,
    };
  }, [arbApy, arbIncentiveApr, avaxApy, avaxIncentiveApr]);

  const maxGlvApyText = useMemo(() => {
    const arb = !arbGlvApy
      ? "...%"
      : `${formatAmount(calculateMaxApr(arbGlvApy, arbGlvIncentiveApr ?? {}, ARBITRUM), 28, 2)}%`;
    const avax = !avaxGlvApy
      ? "...%"
      : `${formatAmount(calculateMaxApr(avaxGlvApy, avaxGlvIncentiveApr ?? {}, AVALANCHE), 28, 2)}%`;
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
        <div className="Home-token-card-option-action">
          <div className="buy">
            <BuyLink
              chainId={chainId}
              active={active}
              className="default-btn"
              to="/buy_gmx"
              network={ARBITRUM}
              showRedirectModal={showRedirectModal}
            >
              <Trans>View on Arbitrum</Trans>
            </BuyLink>
            <BuyLink
              chainId={chainId}
              active={active}
              className="default-btn"
              to="/buy_gmx"
              network={AVALANCHE}
              showRedirectModal={showRedirectModal}
            >
              <Trans>View on Avalanche</Trans>
            </BuyLink>
          </div>
          <Button
            className="!py-11 tracking-normal"
            newTab
            variant="secondary"
            to="https://docs.gmx.io/docs/category/tokenomics"
          >
            <Trans>Read more</Trans>
          </Button>
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

        <div className="Home-token-card-option-action Token-card-buy">
          <div className="buy">
            <BuyLink
              to="/pools?pickBestGlv=1"
              className="default-btn"
              network={ARBITRUM}
              chainId={chainId}
              active={active}
              showRedirectModal={showRedirectModal}
            >
              <Trans>View on Arbitrum</Trans>
            </BuyLink>
            {isGlvEnabled(AVALANCHE) && (
              <BuyLink
                to="/pools?pickBestGlv=1"
                className="default-btn"
                network={AVALANCHE}
                chainId={chainId}
                active={active}
                showRedirectModal={showRedirectModal}
              >
                <Trans>View on Avalanche</Trans>
              </BuyLink>
            )}
          </div>
          <a
            href="https://docs.gmx.io/docs/providing-liquidity/v2/#glv-pools"
            target="_blank"
            rel="noreferrer"
            className="default-btn read-more"
          >
            <Trans>Read more</Trans>
          </a>
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

        <div className="Home-token-card-option-action Token-card-buy">
          <div className="buy">
            <BuyLink
              to="/pools"
              className="default-btn"
              network={ARBITRUM}
              chainId={chainId}
              active={active}
              showRedirectModal={showRedirectModal}
            >
              <Trans>View on Arbitrum</Trans>
            </BuyLink>

            <BuyLink
              to="/pools"
              className="default-btn"
              network={AVALANCHE}
              chainId={chainId}
              active={active}
              showRedirectModal={showRedirectModal}
            >
              <Trans>View on Avalanche</Trans>
            </BuyLink>
          </div>
          <a
            href="https://docs.gmx.io/docs/providing-liquidity/v2"
            target="_blank"
            rel="noreferrer"
            className="default-btn read-more"
          >
            <Trans>Read more</Trans>
          </a>
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
        <div className="Home-token-card-option-action">
          <div className="buy">
            <BuyLink
              to="/buy_glp"
              className="default-btn"
              network={ARBITRUM}
              chainId={chainId}
              active={active}
              showRedirectModal={showRedirectModal}
            >
              <Trans>View on Arbitrum</Trans>
            </BuyLink>
            <BuyLink
              to="/buy_glp"
              className="default-btn"
              network={AVALANCHE}
              chainId={chainId}
              active={active}
              showRedirectModal={showRedirectModal}
            >
              <Trans>View on Avalanche</Trans>
            </BuyLink>
          </div>
          <a
            href="https://docs.gmx.io/docs/providing-liquidity/v1"
            target="_blank"
            rel="noreferrer"
            className="default-btn read-more"
          >
            <Trans>Read more</Trans>
          </a>
        </div>
      </div>
    </div>
  );
}
