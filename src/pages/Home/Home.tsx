import { Trans } from "@lingui/macro";
import { useEffect } from "react";
import useSWR from "swr";

import { getServerUrl } from "config/backend";
import { ARBITRUM, AVALANCHE, BOTANIX } from "config/chains";
import { SyntheticsStateContextProvider } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { useUserStat } from "domain/legacy";
import useV2Stats from "domain/synthetics/stats/useV2Stats";
import { getTotalVolumeSum, shouldShowRedirectModal } from "lib/legacy";
import { bigNumberify, formatBigUsd, numberWithCommas } from "lib/numbers";
import { userAnalytics } from "lib/userAnalytics";
import { LandingPageLaunchAppEvent, LandingPageViewEvent } from "lib/userAnalytics/types";
import { useRedirectPopupTimestamp } from "lib/useRedirectPopupTimestamp";

import { HeaderLink } from "components/Header/HeaderLink";
import TokenCard from "components/TokenCard/TokenCard";

import arbitrumIcon from "img/ic_arbitrum_96.svg";
import avaxIcon from "img/ic_avalanche_96.svg";
import botanixIcon from "img/ic_botanix_96.svg";
import costIcon from "img/ic_cost.svg";
import liquidityIcon from "img/ic_liquidity.svg";
import simpleSwapIcon from "img/ic_simpleswaps.svg";
import statsIcon from "img/ic_stats.svg";
import totaluserIcon from "img/ic_totaluser.svg";
import tradingIcon from "img/ic_trading.svg";

import "./Home.css";

function LaunchExchangeButton({
  showRedirectModal,
  position,
  chainId,
}: {
  showRedirectModal: (to: string) => void;
  position: "Title" | "Chains";
  chainId: number;
}) {
  const [redirectPopupTimestamp] = useRedirectPopupTimestamp();

  return (
    <HeaderLink
      onClick={async () => {
        await userAnalytics.pushEvent<LandingPageLaunchAppEvent>(
          {
            event: "LandingPageAction",
            data: {
              action: "LaunchApp",
              buttonPosition: position,
              shouldSeeConfirmationDialog: shouldShowRedirectModal(redirectPopupTimestamp),
            },
          },
          { instantSend: true }
        );
      }}
      className="default-btn"
      to={`/trade?${userAnalytics.getSessionForwardParams()}&chainId=${chainId}`}
      showRedirectModal={showRedirectModal}
    >
      <Trans>Launch App</Trans>
    </HeaderLink>
  );
}

export default function Home({ showRedirectModal }) {
  const arbV2Stats = useV2Stats(ARBITRUM);
  const avaxV2Stats = useV2Stats(AVALANCHE);

  // ARBITRUM

  const arbitrumPositionStatsUrl = getServerUrl(ARBITRUM, "/position_stats");
  const { data: arbitrumPositionStats } = useSWR([arbitrumPositionStatsUrl], {
    fetcher: (args) => fetch(...args).then((res) => res.json()),
  });

  const arbitrumTotalVolumeUrl = getServerUrl(ARBITRUM, "/total_volume");
  const { data: arbitrumTotalVolume } = useSWR([arbitrumTotalVolumeUrl], {
    fetcher: (args) => fetch(...args).then((res) => res.json()),
  });

  // AVALANCHE

  const avalanchePositionStatsUrl = getServerUrl(AVALANCHE, "/position_stats");
  const { data: avalanchePositionStats } = useSWR([avalanchePositionStatsUrl], {
    fetcher: (args) => fetch(...args).then((res) => res.json()),
  });

  const avalancheTotalVolumeUrl = getServerUrl(AVALANCHE, "/total_volume");
  const { data: avalancheTotalVolume } = useSWR([avalancheTotalVolumeUrl], {
    fetcher: (args) => fetch(...args).then((res) => res.json()),
  });

  // Total Volume

  const arbitrumTotalVolumeSum = getTotalVolumeSum(arbitrumTotalVolume);
  const avalancheTotalVolumeSum = getTotalVolumeSum(avalancheTotalVolume);

  let totalVolumeSum = 0n;
  if (arbitrumTotalVolumeSum !== undefined && avalancheTotalVolumeSum !== undefined && arbV2Stats && avaxV2Stats) {
    totalVolumeSum = totalVolumeSum + arbitrumTotalVolumeSum;
    totalVolumeSum = totalVolumeSum + avalancheTotalVolumeSum;
    totalVolumeSum = totalVolumeSum + BigInt(arbV2Stats.totalVolume);
    totalVolumeSum = totalVolumeSum + BigInt(avaxV2Stats.totalVolume);
  }

  // Open Interest

  let openInterest = 0n;
  if (
    arbitrumPositionStats &&
    arbitrumPositionStats.totalLongPositionSizes &&
    arbitrumPositionStats.totalShortPositionSizes
  ) {
    openInterest = openInterest + BigInt(arbitrumPositionStats.totalLongPositionSizes);
    openInterest = openInterest + BigInt(arbitrumPositionStats.totalShortPositionSizes);
  }

  if (
    avalanchePositionStats &&
    avalanchePositionStats.totalLongPositionSizes &&
    avalanchePositionStats.totalShortPositionSizes
  ) {
    openInterest = openInterest + BigInt(avalanchePositionStats.totalLongPositionSizes);
    openInterest = openInterest + BigInt(avalanchePositionStats.totalShortPositionSizes);
  }

  if (arbV2Stats && avaxV2Stats) {
    openInterest = openInterest + arbV2Stats.openInterest;
    openInterest = openInterest + avaxV2Stats.openInterest;
  }

  // user stat
  const arbitrumUserStats = useUserStat(ARBITRUM);
  const avalancheUserStats = useUserStat(AVALANCHE);
  let totalUsers = 0;

  if (arbitrumUserStats && arbitrumUserStats.uniqueCount) {
    totalUsers += arbitrumUserStats.uniqueCount;
  }

  if (avalancheUserStats && avalancheUserStats.uniqueCount) {
    totalUsers += avalancheUserStats.uniqueCount;
  }

  if (arbV2Stats && avaxV2Stats) {
    totalUsers = Number(bigNumberify(totalUsers)! + arbV2Stats.totalUsers + avaxV2Stats.totalUsers);
  }

  useEffect(() => {
    userAnalytics.pushEvent<LandingPageViewEvent>(
      {
        event: "LandingPageAction",
        data: {
          action: "PageView",
        },
      },
      { onlyOncePerSession: true }
    );
  }, []);

  return (
    <div className="Home">
      <div className="Home-top">
        <div className="Home-title-section-container default-container">
          <div className="Home-title-section">
            <div className="Home-title">
              <Trans>
                Decentralized
                <br />
                Perpetual Exchange
              </Trans>
            </div>
            <div className="Home-description">
              <Trans>
                Trade BTC, ETH, AVAX and other top cryptocurrencies with up to 100x leverage directly from your wallet
              </Trans>
            </div>
            <LaunchExchangeButton showRedirectModal={showRedirectModal} position="Title" chainId={ARBITRUM} />
          </div>
        </div>
        <div className="Home-latest-info-container default-container">
          <div className="Home-latest-info-block">
            <img src={tradingIcon} alt="Total Trading Volume Icon" className="Home-latest-info__icon" />
            <div className="Home-latest-info-content">
              <div className="Home-latest-info__title">
                <Trans>Total Trading Volume</Trans>
              </div>
              <div className="Home-latest-info__value">{formatBigUsd(totalVolumeSum)}</div>
            </div>
          </div>
          <div className="Home-latest-info-block">
            <img src={statsIcon} alt="Open Interest Icon" className="Home-latest-info__icon" />
            <div className="Home-latest-info-content">
              <div className="Home-latest-info__title">
                <Trans>Open Interest</Trans>
              </div>
              <div className="Home-latest-info__value">{formatBigUsd(openInterest)}</div>
            </div>
          </div>
          <div className="Home-latest-info-block">
            <img src={totaluserIcon} alt="Total Users Icon" className="Home-latest-info__icon" />
            <div className="Home-latest-info-content">
              <div className="Home-latest-info__title">
                <Trans>Total Users</Trans>
              </div>
              <div className="Home-latest-info__value">{numberWithCommas(totalUsers.toFixed(0))}</div>
            </div>
          </div>
        </div>
      </div>
      <div className="Home-benefits-section">
        <div className="Home-benefits default-container">
          <div className="Home-benefit">
            <div className="Home-benefit-icon">
              <img src={liquidityIcon} alt="Reduce Liquidation Risks Icon" className="Home-benefit-icon-symbol" />
              <div className="Home-benefit-title">
                <Trans>Reduce Liquidation Risks</Trans>
              </div>
            </div>
            <div className="Home-benefit-description">
              <Trans>
                An aggregate of high-quality price feeds determine when liquidations occur. This keeps positions safe
                from temporary wicks.
              </Trans>
            </div>
          </div>
          <div className="Home-benefit">
            <div className="Home-benefit-icon">
              <img src={costIcon} alt="Save on Costs Icon" className="Home-benefit-icon-symbol" />
              <div className="Home-benefit-title">
                <Trans>Save on Costs</Trans>
              </div>
            </div>
            <div className="Home-benefit-description">
              <Trans>
                Enter and exit positions with minimal spread and low price impact. Get the optimal price without
                incurring additional costs.
              </Trans>
            </div>
          </div>
          <div className="Home-benefit">
            <div className="Home-benefit-icon">
              <img src={simpleSwapIcon} alt="Simple Swaps Icon" className="Home-benefit-icon-symbol" />
              <div className="Home-benefit-title">
                <Trans>Simple Swaps</Trans>
              </div>
            </div>
            <div className="Home-benefit-description">
              <Trans>
                Open positions through a simple swap interface. Conveniently swap from any supported asset into the
                position of your choice.
              </Trans>
            </div>
          </div>
        </div>
      </div>
      <div className="Home-cta-section">
        <div className="Home-cta-container default-container">
          <div className="Home-cta-info">
            <div className="Home-cta-info__title">
              <Trans>Available on your preferred network</Trans>
            </div>
            <div className="Home-cta-info__description">
              <Trans>GMX is currently live on Arbitrum and Avalanche.</Trans>
            </div>
          </div>
          <div className="Home-cta-options">
            <div className="Home-cta-option Home-cta-option-arbitrum">
              <div className="Home-cta-option-icon">
                <img src={arbitrumIcon} width="96" alt="Arbitrum Icon" />
              </div>
              <div className="Home-cta-option-info">
                <div className="Home-cta-option-title">Arbitrum</div>
                <div className="Home-cta-option-action">
                  <LaunchExchangeButton showRedirectModal={showRedirectModal} position="Chains" chainId={ARBITRUM} />
                </div>
              </div>
            </div>
            <div className="Home-cta-option Home-cta-option-ava">
              <div className="Home-cta-option-icon">
                <img src={avaxIcon} width="96" alt="Avalanche Icon" />
              </div>
              <div className="Home-cta-option-info">
                <div className="Home-cta-option-title">Avalanche</div>
                <div className="Home-cta-option-action">
                  <LaunchExchangeButton showRedirectModal={showRedirectModal} position="Chains" chainId={AVALANCHE} />
                </div>
              </div>
            </div>

            <div className="Home-cta-option Home-cta-option-botanix">
              <div className="Home-cta-option-icon">
                <img src={botanixIcon} width="96" alt="Botanix Icon" />
              </div>
              <div className="Home-cta-option-info">
                <div className="Home-cta-option-title">Botanix</div>
                <div className="Home-cta-option-action">
                  <LaunchExchangeButton showRedirectModal={showRedirectModal} position="Chains" chainId={BOTANIX} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="Home-token-card-section">
        <div className="Home-token-card-container default-container">
          <div className="Home-token-card-info">
            <div className="Home-token-card-info__title">
              <Trans>Protocol Tokens</Trans>
            </div>
          </div>
          <SyntheticsStateContextProvider pageType="home" skipLocalReferralCode={false}>
            <TokenCard showRedirectModal={showRedirectModal} showGlp={false} />
          </SyntheticsStateContextProvider>
        </div>
      </div>

      {/* <div className="Home-video-section">
        <div className="Home-video-container default-container">
          <div className="Home-video-block">
            <img src={gmxBigIcon} alt="gmxbig" />
          </div>
        </div>
      </div> */}
      {/* <div className="Home-faqs-section">
        <div className="Home-faqs-container default-container">
          <div className="Home-faqs-introduction">
            <div className="Home-faqs-introduction__title">FAQs</div>
            <div className="Home-faqs-introduction__description">Most asked questions. If you wish to learn more, please head to our Documentation page.</div>
            <a href="https://gmxio.gitbook.io/gmx/" className="default-btn Home-faqs-documentation">Documentation</a>
          </div>
          <div className="Home-faqs-content-block">
            {
              faqContent.map((content, index) => (
                <div className="Home-faqs-content" key={index} onClick={() => toggleFAQContent(index)}>
                  <div className="Home-faqs-content-header">
                    <div className="Home-faqs-content-header__icon">
                      {
                        openedFAQIndex === index ? <FiMinus className="opened" /> : <FiPlus className="closed" />
                      }
                    </div>
                    <div className="Home-faqs-content-header__text">
                      { content.question }
                    </div>
                  </div>
                  <div className={ openedFAQIndex === index ? "Home-faqs-content-main opened" : "Home-faqs-content-main" }>
                    <div className="Home-faqs-content-main__text">
                      <div dangerouslySetInnerHTML={{__html: content.answer}} >
                      </div>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div> */}
    </div>
  );
}
