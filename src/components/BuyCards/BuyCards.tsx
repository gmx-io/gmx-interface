import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import keys from "lodash/keys";
import uniq from "lodash/uniq";
import { ReactNode, useCallback, useMemo } from "react";

import { ARBITRUM, AVALANCHE, BOTANIX } from "config/chains";
import { getIcon } from "config/icons";
import { isGlvEnabled } from "domain/synthetics/markets/glv";
import type { MarketTokensAPRData } from "domain/synthetics/markets/types";
import { useGmMarketsApy } from "domain/synthetics/markets/useGmMarketsApy";
import { useChainId } from "lib/chains";
import { formatAmount } from "lib/numbers";
import { userAnalytics } from "lib/userAnalytics";
import { switchNetwork } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import APRLabel from "components/APRLabel/APRLabel";
import Badge from "components/Badge/Badge";
import Button from "components/Button/Button";
import { TrackingLink } from "components/TrackingLink/TrackingLink";

import ArbitrumIcon from "img/ic_arbitrum_24.svg?react";
import AvalancheIcon from "img/ic_avalanche_24.svg?react";
import BotanixIcon from "img/ic_botanix_24.svg?react";

const glpIcon = getIcon("common", "glp");
const gmxIcon = getIcon("common", "gmx");
const gmIcon = getIcon("common", "gm");
const glvIcon = getIcon("common", "glv");

const NETWORK_ICONS = {
  [ARBITRUM]: ArbitrumIcon,
  [AVALANCHE]: AvalancheIcon,
  [BOTANIX]: BotanixIcon,
};

const NETWORK_NAMES = {
  [ARBITRUM]: "Arbitrum",
  [AVALANCHE]: "Avalanche",
  [BOTANIX]: "Botanix",
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

const BuyLink = ({
  chainId,
  active,
  to,
  network,
  badge,
}: {
  chainId: number;
  active: boolean;
  to: string;
  network: number;
  badge?: ReactNode;
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

  const Icon = NETWORK_ICONS[network];

  return (
    <Button to={to} onClick={() => changeNetwork(network)} variant="secondary" className="flex gap-8">
      <Icon className="size-24" />
      <span className="text-typography-primary">{NETWORK_NAMES[network]}</span>
      {badge ? <Badge>{badge}</Badge> : null}
    </Button>
  );
};

function getTrackingLink(link: string) {
  const paramsPrefix = link.includes("?") ? "&" : "?";

  return `${link}${paramsPrefix}${userAnalytics.getSessionForwardParams()}`;
}

const PERIOD = "90d";

export default function BuyCards() {
  const { chainId } = useChainId();
  const { active } = useWallet();

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

  return (
    <div className="flex w-full flex-col gap-8">
      <BuyCard
        title={<Trans>GMX</Trans>}
        icon={gmxIcon}
        description={
          <Trans>
            GMX is the utility and governance token. It also accrues 30% of the protocol fees via a buyback and
            distribution mechanism.
          </Trans>
        }
        alt="GMX Icons"
        type="buy"
      >
        <div className={cx("flex justify-between max-lg:flex-col max-lg:gap-12")}>
          <div className={cx("buy flex gap-12 max-lg:flex-col")}>
            <BuyLink
              chainId={chainId}
              active={active}
              to={getTrackingLink("/buy_gmx")}
              network={ARBITRUM}
              badge={
                <span>
                  APR <APRLabel chainId={ARBITRUM} label="avgGMXAprTotal" />
                </span>
              }
            ></BuyLink>
            <BuyLink
              chainId={chainId}
              active={active}
              to={getTrackingLink("/buy_gmx")}
              network={AVALANCHE}
              badge={
                <span>
                  APR <APRLabel chainId={AVALANCHE} label="avgGMXAprTotal" />
                </span>
              }
            ></BuyLink>
          </div>
          <TrackingLink>
            <Button
              className="!text-typography-primary"
              newTab
              variant="secondary"
              to="https://docs.gmx.io/docs/category/tokenomics"
            >
              <Trans>Read more</Trans>
            </Button>
          </TrackingLink>
        </div>
      </BuyCard>
      <BuyCard
        title={<Trans>GLV</Trans>}
        icon={glvIcon}
        description={
          <Trans>
            GLV is the liquidity provider token for GMX V2 vaults. Consist of several GM tokens and accrues fees
            generated by them.
          </Trans>
        }
        alt="GLV icon"
        type="buy"
      >
        <div className={cx("flex justify-between max-lg:flex-col max-lg:gap-12")}>
          <div className={cx("buy flex gap-12 max-lg:flex-col")}>
            <BuyLink
              to={getTrackingLink("/pools?pickBestGlv=1")}
              network={ARBITRUM}
              chainId={chainId}
              active={active}
              badge={<span>MAX. APY {maxGlvApyText[ARBITRUM]}</span>}
            />

            {isGlvEnabled(AVALANCHE) && (
              <BuyLink
                to={getTrackingLink("/pools?pickBestGlv=1")}
                network={AVALANCHE}
                chainId={chainId}
                active={active}
                badge={<span>MAX. APY {maxGlvApyText[AVALANCHE]}</span>}
              />
            )}

            <BuyLink to={getTrackingLink("/pools?pickBestGlv=1")} network={BOTANIX} chainId={chainId} active={active} />
          </div>
          <TrackingLink>
            <Button
              className="!text-typography-primary"
              newTab
              variant="secondary"
              to="https://docs.gmx.io/docs/providing-liquidity/v2/#glv-pools"
            >
              <Trans>Read more</Trans>
            </Button>
          </TrackingLink>
        </div>
      </BuyCard>
      <BuyCard
        title={<Trans>GM</Trans>}
        icon={gmIcon}
        description={
          <Trans>
            GM is the liquidity provider token for GMX V2 markets. Accrues 63% of the V2 markets generated fees.
          </Trans>
        }
        alt="GM icon"
        type="buy"
      >
        <div className={cx("flex justify-between max-lg:flex-col max-lg:gap-12")}>
          <div className={cx("buy flex gap-12 max-lg:flex-col")}>
            <BuyLink
              to={getTrackingLink("/pools")}
              network={ARBITRUM}
              chainId={chainId}
              active={active}
              badge={<span>MAX. APY {maxMarketApyText[ARBITRUM]}</span>}
            />

            <BuyLink
              to={getTrackingLink("/pools")}
              network={AVALANCHE}
              chainId={chainId}
              active={active}
              badge={<span>MAX. APY {maxMarketApyText[AVALANCHE]}</span>}
            />

            <BuyLink to={getTrackingLink("/pools")} network={BOTANIX} chainId={chainId} active={active} />
          </div>
          <TrackingLink>
            <Button
              className="!text-typography-primary"
              newTab
              variant="secondary"
              to="https://docs.gmx.io/docs/providing-liquidity/v2"
            >
              <Trans>Read more</Trans>
            </Button>
          </TrackingLink>
        </div>
      </BuyCard>

      <BuyCard
        title={<Trans>GLP</Trans>}
        icon={glpIcon}
        description={
          <Trans>GMX V1 markets are disabled. GLP is being phased out and no longer supports GMX V1 markets.</Trans>
        }
        alt="GLP icon"
        type="sell"
      >
        <div className={cx("flex justify-between max-lg:flex-col max-lg:gap-12")}>
          <div className={cx("buy flex gap-12 max-lg:flex-col")}>
            <BuyLink to={getTrackingLink("/buy_glp#redeem")} network={ARBITRUM} chainId={chainId} active={active} />
            <BuyLink to={getTrackingLink("/buy_glp#redeem")} network={AVALANCHE} chainId={chainId} active={active} />
            <AlertInfoCard type="warning" hideClose className="!py-10">
              <Trans>GLP is no longer available for buy</Trans>
            </AlertInfoCard>
          </div>
          <TrackingLink>
            <Button
              className="!text-typography-primary"
              newTab
              variant="secondary"
              to="https://docs.gmx.io/docs/providing-liquidity/v1"
            >
              <Trans>Read more</Trans>
            </Button>
          </TrackingLink>
        </div>
      </BuyCard>
    </div>
  );
}

function BuyCard({
  title,
  icon,
  description,
  children,
  alt,
  type,
}: {
  title: ReactNode;
  icon: string | undefined;
  description: ReactNode;
  children: ReactNode;
  alt: string;
  type: "buy" | "sell";
}) {
  return (
    <div className="flex w-full flex-col gap-20 rounded-8 bg-slate-900 p-20">
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-4">
          <img src={icon} alt={alt} className="size-16" />
          <div className="text-20 font-medium text-typography-primary">{title}</div>
        </div>
        <div className="text-13 text-typography-secondary">{description}</div>
      </div>
      <div className="flex flex-col gap-10">
        <div className="text-caption !text-slate-500">{type === "buy" ? t`Buy token on` : t`Sell token on`}</div>
        {children}
      </div>
    </div>
  );
}
