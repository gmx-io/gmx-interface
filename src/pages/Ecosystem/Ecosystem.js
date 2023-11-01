import React from "react";
import { Trans } from "@lingui/macro";
import SEO from "components/Common/SEO";

import Footer from "components/Footer/Footer";
import { getPageTitle } from "lib/legacy";

import "./Ecosystem.css";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { ARBITRUM, AVALANCHE } from "config/chains";
import { t } from "@lingui/macro";
import { getIcon } from "config/icons";
import PageTitle from "components/PageTitle/PageTitle";

const NETWORK_ICONS = {
  [ARBITRUM]: getIcon(ARBITRUM, "network"),
  [AVALANCHE]: getIcon(AVALANCHE, "network"),
};

const NETWORK_ICON_ALTS = {
  [ARBITRUM]: "Arbitrum Icon",
  [AVALANCHE]: "Avalanche Icon",
};

export default function Ecosystem() {
  const gmxPages = [
    {
      title: "GMX Governance",
      link: "https://gov.gmx.io/",
      linkLabel: "gov.gmx.io",
      about: t`GMX Governance Page`,
      chainIds: [ARBITRUM, AVALANCHE],
    },
    {
      title: "GMX Stats",
      link: "https://stats.gmx.io/",
      linkLabel: "stats.gmx.io",
      about: t`GMX Stats Page`,
      chainIds: [ARBITRUM, AVALANCHE],
    },
    {
      title: "GMX Proposals",
      link: "https://snapshot.org/#/gmx.eth",
      linkLabel: "snapshot.org",
      about: t`GMX Proposals Voting page`,
      chainIds: [ARBITRUM, AVALANCHE],
    },
    {
      title: "GMX Announcements",
      link: "https://t.me/GMX_Announcements",
      linkLabel: "t.me",
      about: t`GMX Announcements and Updates`,
      chainIds: [ARBITRUM, AVALANCHE],
    },
  ];

  const communityProjects = [
    {
      title: "GMX Blueberry Club",
      link: "https://www.blueberry.club/",
      linkLabel: "blueberry.club",
      about: t`GMX Blueberry NFTs`,
      creatorLabel: "@xm_gbc",
      creatorLink: "https://t.me/xm_gbc",
      chainIds: [ARBITRUM],
    },
    {
      title: "GMX Leaderboard",
      link: "https://www.gmx.house/",
      linkLabel: "gmx.house",
      about: t`Leaderboard for GMX traders`,
      creatorLabel: "@Itburnz",
      creatorLink: "https://t.me/Itburnz",
      chainIds: [ARBITRUM, AVALANCHE],
    },
    {
      title: "GMX Positions Bot",
      link: "https://t.me/GMXPositions",
      linkLabel: "t.me",
      about: t`Telegram bot for GMX position updates`,
      creatorLabel: "@zhongfu",
      creatorLink: "https://t.me/zhongfu",
      chainIds: [ARBITRUM, AVALANCHE],
    },
    {
      title: "Blueberry Pulse",
      link: "https://blueberrypulse.substack.com/",
      linkLabel: "substack.com",
      about: t`GMX Weekly Updates`,
      creatorLabel: "@puroscohiba",
      creatorLink: "https://t.me/puroscohiba",
      chainIds: [ARBITRUM, AVALANCHE],
    },
    {
      title: "GMX Yield Simulator",
      link: "https://gmx.defisims.com/",
      linkLabel: "defisims.com",
      about: t`Yield simulator for GMX`,
      creatorLabel: "@kyzoeth",
      creatorLink: "https://twitter.com/kyzoeth",
      chainIds: [ARBITRUM, AVALANCHE],
    },
    {
      title: "GMX Returns Calculator",
      link: "https://docs.google.com/spreadsheets/u/4/d/1mQZlztz_NpTg5qQiYIzc_Ls1OTLfMOUtmEQN-WW8jj4/copy",
      linkLabel: "docs.google.com",
      about: t`Returns calculator for GMX and GLP`,
      creatorLabel: "@AStoicTrader1",
      creatorLink: "https://twitter.com/AStoicTrader1",
      chainIds: [ARBITRUM, AVALANCHE],
    },
    {
      title: "GMX Trading Stats",
      link: "https://t.me/GMXTradingStats",
      linkLabel: "t.me",
      about: t`Telegram bot for Open Interest on GMX`,
      creatorLabel: "@SniperMonke01",
      creatorLink: "https://twitter.com/SniperMonke01",
      chainIds: [ARBITRUM, AVALANCHE],
    },
    {
      title: "GMX Staking Bot",
      link: "https://t.me/GMX_Staking_bot",
      linkLabel: "t.me",
      about: t`GMX staking rewards updates and insights`,
      creatorLabel: "@GMX_Staking_bot",
      creatorLink: "https://twitter.com/GMX_Staking_bot",
      chainIds: [ARBITRUM, AVALANCHE],
    },
    {
      title: "GMX Staking Calculator",
      link: "https://gmxstaking.com",
      linkLabel: "gmxstaking.com",
      about: t`GMX staking calculator`,
      creatorLabel: "@n1njawtf",
      creatorLink: "https://t.me/n1njawtf",
      chainIds: [ARBITRUM, AVALANCHE],
    },
    {
      title: "GMX Hedging Simulator",
      link: "https://www.gmxhedge.com/",
      linkLabel: "gmxhedge.com",
      about: t`Simulate your hedge strategy`,
      creatorLabel: "@kyzoeth",
      creatorLink: "https://twitter.com/kyzoeth",
      chainIds: [ARBITRUM],
    },
    {
      title: "GMX Swaps",
      link: "https://t.me/GMXSwaps",
      linkLabel: "t.me",
      about: t`Telegram bot for GMX Swaps monitoring`,
      creatorLabel: "@snipermonke01",
      creatorLink: "https://twitter.com/snipermonke01",
      chainIds: [ARBITRUM, AVALANCHE],
    },
    {
      title: "GMX Position Calculator",
      link: "https://docs.google.com/spreadsheets/d/1OKCeRGU7l-xGx33-siBw_l8x7vP97y4KKKjA2x5LqhQ/edit#gid=0",
      linkLabel: "docs.google.com",
      about: t`Spreadsheet for position calculations`,
      creatorLabel: "@barryfried1",
      creatorLink: "https://twitter.com/barryfried1",
      chainIds: [ARBITRUM, AVALANCHE],
    },
    {
      title: "SNTL esGMX Market",
      link: "https://sntl.market/",
      linkLabel: "sntl.market",
      about: t`esGMX OTC Market`,
      creatorLabel: "@sntlai",
      creatorLink: "https://twitter.com/sntlai",
      chainIds: [ARBITRUM, AVALANCHE],
    },
    {
      title: "Copin",
      link: "https://app.copin.io",
      linkLabel: "copin.io",
      about: t`Explore, analyze, and copy on-chain traders`,
      creatorLabel: ["@0xanol", "@tungle_eth"],
      creatorLink: ["https://twitter.com/0xanol", "https://twitter.com/tungle_eth"],
      chainIds: [ARBITRUM],
    },
  ];

  const dashboardProjects = [
    {
      title: "GMX Referrals Dashboard",
      link: "https://www.gmxreferrals.com/",
      linkLabel: "gmxreferrals.com",
      about: t`Dashboard for GMX referral stats`,
      creatorLabel: "@kyzoeth",
      creatorLink: "https://twitter.com/kyzoeth",
      chainIds: [ARBITRUM, AVALANCHE],
    },
    {
      title: "GMX Terminal",
      link: "https://gmxterminal.com",
      linkLabel: "gmxterminal.com",
      about: t`GMX explorer for stats and traders`,
      creatorLabel: "@vipineth",
      creatorLink: "https://t.me/vipineth",
      chainIds: [ARBITRUM],
    },
    {
      title: "GMX Analytics",
      link: "https://gmxstats.info/",
      linkLabel: "gmxstats.info",
      about: t`Financial reports and protocol analytics`,
      creatorLabel: "@sliux",
      creatorLink: "https://twitter.com/sliux",
      chainIds: [ARBITRUM, AVALANCHE],
    },
    {
      title: "TokenTerminal",
      link: "https://tokenterminal.com/terminal/projects/gmx",
      linkLabel: "tokenterminal.com",
      about: t`GMX fundamentals`,
      creatorLabel: "@tokenterminal",
      creatorLink: "https://twitter.com/tokenterminal",
      chainIds: [ARBITRUM, AVALANCHE],
    },
    {
      title: "CryptoFees",
      link: "https://cryptofees.info",
      linkLabel: "cryptofees.info",
      about: t`Fees generated by GMX`,
      creatorLabel: "@CryptoFeesInfo",
      creatorLink: "https://twitter.com/CryptoFeesInfo",
      chainIds: [ARBITRUM, AVALANCHE],
    },
    {
      title: "Shogun Dashboard (Dune Arbitrum)",
      link: "https://dune.com/shogun/gmx-analytics-arbitrum",
      linkLabel: "dune.com",
      about: t`Protocol analytics`,
      creatorLabel: "@JamesCliffyz",
      creatorLink: "https://twitter.com/JamesCliffyz",
      chainIds: [ARBITRUM],
    },
    {
      title: "Shogun Dashboard (Dune Avalanche)",
      link: "https://dune.com/shogun/gmx-analytics-avalanche",
      linkLabel: "dune.com",
      about: t`Protocol analytics`,
      creatorLabel: "@JamesCliffyz",
      creatorLink: "https://twitter.com/JamesCliffyz",
      chainIds: [AVALANCHE],
    },
    {
      title: "GMX Perpetuals Data",
      link: "https://app.laevitas.ch/altsderivs/GMX/perpetualswaps",
      linkLabel: "laevitas.ch",
      about: t`GMX Perpetuals Data`,
      creatorLabel: "@laevitas1",
      creatorLink: "https://twitter.com/laevitas1",
      chainIds: [ARBITRUM],
    },
    {
      title: "GMX Blueberry Leaderboard",
      link: "https://www.blueberryboard.com",
      linkLabel: "blueberryboard.com",
      about: t`GBC NFTs APR tracker and rewards`,
      creatorLabel: "@kyzoeth",
      creatorLink: "https://twitter.com/kyzoeth",
      chainIds: [ARBITRUM],
    },
    {
      title: "GMX Open Trades Ranking and Stats",
      link: "https://dune.com/HanSolar/gmx-open-trade-ranking-and-stats",
      linkLabel: "dune.com",
      about: t`Open trades ranking and stats`,
      creatorLabel: "@hansolar21",
      creatorLink: "https://twitter.com/hansolar21",
      chainIds: [ARBITRUM, AVALANCHE],
    },
    {
      title: "GMX Everything Dashboard",
      link: "https://dune.com/gmxtrader/gmx-dashboard-insights",
      linkLabel: "dune.com",
      about: t`Overall protocol analytics`,
      creatorLabel: "@gmxtrader",
      creatorLink: "https://twitter.com/gmxtrader",
      chainIds: [ARBITRUM, AVALANCHE],
    },
    {
      title: "Staking Rewards Calculator",
      link: "https://www.stakingrewards.com/earn/gmx/",
      linkLabel: "stakingrewards.com",
      about: t`GMX staking calculator and guide`,
      creatorLabel: "@stakingrewards",
      creatorLink: "https://twitter.com/stakingrewards",
      chainIds: [ARBITRUM, AVALANCHE],
    },
    {
      title: "GMX Risk Monitoring",
      link: "https://community.chaoslabs.xyz/gmx-arbitrum/ccar-perps/overview",
      linkLabel: "chaoslabs.xyz",
      about: t`Protocol risk explorer and stats`,
      creatorLabel: "@chaos_labs",
      creatorLink: "https://twitter.com/chaos_labs",
      chainIds: [ARBITRUM, AVALANCHE],
    },
  ];

  const integrations = [
    {
      title: "DeBank",
      link: "debank.com",
      linkLabe: "debank.com",
      about: t`DeFi Portfolio Tracker`,

      chainIds: [ARBITRUM, AVALANCHE],
    },
    {
      title: "Defi Llama",
      link: "https://defillama.com",
      linkLabel: "defillama.com",
      about: t`Decentralized Finance Dashboard`,

      chainIds: [ARBITRUM, AVALANCHE],
    },
    {
      title: "Dopex",
      link: "https://dopex.io",
      linkLabel: "dopex.io",
      about: t`Decentralized Options Protocol`,
      chainIds: [ARBITRUM, AVALANCHE],
    },
    {
      title: "Jones DAO",
      link: "https://jonesdao.io",
      linkLabel: "jonesdao.io",
      about: t`Decentralized Options Strategies`,

      chainIds: [ARBITRUM],
    },
    {
      title: "Yield Yak Optimizer",
      link: "https://yieldyak.com/",
      linkLabel: "yieldyak.com",
      about: t`Yield Optimizer on Avalanche`,

      chainIds: [AVALANCHE],
    },
    {
      title: "Vovo Finance",
      link: "https://vovo.finance/",
      linkLabel: "vovo.finance",
      about: t`Structured Products`,

      chainIds: [ARBITRUM],
    },
    {
      title: "Stabilize Protocol",
      link: "https://www.stabilize.finance/",
      linkLabel: "stabilize.finance",
      about: t`Yield Vaults`,

      chainIds: [ARBITRUM],
    },
    {
      title: "DODO",
      link: "https://dodoex.io/",
      linkLabel: "dodoex.io",
      about: t`Decentralized Trading Protocol`,

      chainIds: [ARBITRUM, AVALANCHE],
    },
    {
      title: "Open Ocean",
      link: "https://openocean.finance/",
      linkLabel: "openocean.finance",
      about: t`DEX Aggregator`,

      chainIds: [ARBITRUM, AVALANCHE],
    },
    {
      title: "Paraswap",
      link: "https://www.paraswap.io/",
      linkLabel: "paraswap.io",
      about: t`DEX Aggregator`,

      chainIds: [ARBITRUM, AVALANCHE],
    },
    {
      title: "1inch",
      link: "https://1inch.io/",
      linkLabel: "1inch.io",
      about: t`DEX Aggregator`,

      chainIds: [ARBITRUM, AVALANCHE],
    },
    {
      title: "Firebird Finance",
      link: "https://app.firebird.finance/swap",
      linkLabel: "firebird.finance",
      about: t`DEX Aggregator`,

      chainIds: [AVALANCHE],
    },
    {
      title: "Yield Yak Swap",
      link: "https://yieldyak.com/swap",
      linkLabel: "yieldyak.com",
      about: t`DEX Aggregator`,

      chainIds: [AVALANCHE],
    },
    {
      title: "Plutus",
      link: "https://plutusdao.io/vaults",
      linkLabel: "plutusdao.io",
      about: t`GLP autocompounding vaults`,

      chainIds: [ARBITRUM],
    },
    {
      title: "Beefy",
      link: "https://app.beefy.com/",
      linkLabel: "beefy.com",
      about: t`GLP and GMX autocompounding vaults`,

      chainIds: [ARBITRUM, AVALANCHE],
    },
    {
      title: "Pendle Finance",
      link: "https://app.pendle.finance/pro/markets",
      linkLabel: "pendle.finance",
      about: t`Yield Trading`,

      chainIds: [ARBITRUM],
    },
    {
      title: "ODOS",
      link: "https://app.odos.xyz/",
      linkLabel: "odos.xyz",
      about: t`DEX Aggregator`,

      chainIds: [ARBITRUM, AVALANCHE],
    },
    {
      title: "Dolomite",
      link: "https://app.dolomite.io/balances",
      linkLabel: "dolomite.io",
      about: t`Decentralized Money Market`,

      chainIds: [ARBITRUM],
    },
    {
      title: "UniDex Leverage",
      link: "https://leverage.unidex.exchange/",
      linkLabel: "unidex.exchange",
      about: t`Leverage Trading Terminal`,
      chainIds: [ARBITRUM, AVALANCHE],
    },
    {
      title: "Symbiosis",
      link: "https://app.symbiosis.finance/",
      linkLabel: "symbiosis.finance",
      about: t`DEX Aggregator`,
      chainIds: [ARBITRUM, AVALANCHE],
    },
    {
      title: "0x",
      link: "https://explorer.0xprotocol.org/liquiditySources",
      linkLabel: "0xprotocol.org",
      about: t`DEX Aggregator`,
      chainIds: [ARBITRUM, AVALANCHE],
    },
  ];

  const telegramGroups = [
    {
      title: "GMX",
      link: "https://t.me/GMX_IO",
      linkLabel: "t.me",
      about: t`Telegram Group`,
    },
    {
      title: "GMX (Chinese)",
      link: "https://t.me/gmxch",
      linkLabel: "t.me",
      about: t`Telegram Group (Chinese)`,
    },
    {
      title: "GMX (Portuguese)",
      link: "https://t.me/GMX_Portuguese",
      linkLabel: "t.me",
      about: t`Telegram Group (Portuguese)`,
    },
    {
      title: "GMX Trading Chat",
      link: "https://t.me/gambittradingchat",
      linkLabel: "t.me",
      about: t`GMX community discussion`,
    },
  ];

  return (
    <SEO title={getPageTitle(t`Ecosystem Projects`)}>
      <div className="default-container page-layout">
        <div>
          <PageTitle showNetworkIcon={false} isTop title={t`GMX Pages`} subtitle={t`GMX ecosystem pages.`} />
          <div className="Ecosystem-projects">
            {gmxPages.map((item) => {
              const linkLabel = item.linkLabel ? item.linkLabel : item.link;
              return (
                <div className="App-card" key={item.title}>
                  <div className="App-card-title">
                    {item.title}
                    <div className="App-card-title-icon">
                      {item.chainIds.map((network) => (
                        <img width="16" key={network} src={NETWORK_ICONS[network]} alt={NETWORK_ICON_ALTS[network]} />
                      ))}
                    </div>
                  </div>
                  <div className="App-card-divider"></div>
                  <div className="App-card-content">
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Link</Trans>
                      </div>
                      <div>
                        <ExternalLink href={item.link}>{linkLabel}</ExternalLink>
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>About</Trans>
                      </div>
                      <div>{item.about}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <PageTitle
            showNetworkIcon={false}
            title={t`Community Projects`}
            subtitle={
              <Trans>
                Projects developed by the GMX community. <br />
                Please exercise caution when interacting with any app, apps are fully maintained by community
                developers.
              </Trans>
            }
          />
          <div className="Ecosystem-projects">
            {communityProjects.map((item) => {
              const linkLabel = item.linkLabel ? item.linkLabel : item.link;
              return (
                <div className="App-card" key={item.title}>
                  <div className="App-card-title">
                    {item.title}
                    <div className="App-card-title-icon">
                      {item.chainIds.map((network) => (
                        <img width="16" key={network} src={NETWORK_ICONS[network]} alt={NETWORK_ICON_ALTS[network]} />
                      ))}
                    </div>
                  </div>
                  <div className="App-card-divider" />
                  <div className="App-card-content">
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Link</Trans>
                      </div>
                      <div>
                        <ExternalLink href={item.link}>{linkLabel}</ExternalLink>
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>About</Trans>
                      </div>
                      <div>{item.about}</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Creator</Trans>
                      </div>
                      <div>
                        {Array.isArray(item.creatorLabel) ? (
                          <div className="gap-right-xs">
                            {item.creatorLabel.map((label, index) => (
                              <ExternalLink key={label} href={item.creatorLink[index]}>
                                {label}
                              </ExternalLink>
                            ))}
                          </div>
                        ) : (
                          <ExternalLink href={item.creatorLink}>{item.creatorLabel}</ExternalLink>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <PageTitle showNetworkIcon={false} title={t`Dashboards`} subtitle={t`GMX dashboards and analytics.`} />
          <div className="Ecosystem-projects">
            {dashboardProjects.map((item) => {
              const linkLabel = item.linkLabel ? item.linkLabel : item.link;
              return (
                <div className="App-card" key={item.title}>
                  <div className="App-card-title">
                    {item.title}
                    <div className="App-card-title-icon">
                      {item.chainIds.map((network) => (
                        <img width="16" key={network} src={NETWORK_ICONS[network]} alt={NETWORK_ICON_ALTS[network]} />
                      ))}
                    </div>
                  </div>

                  <div className="App-card-divider"></div>
                  <div className="App-card-content">
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Link</Trans>
                      </div>
                      <div>
                        <ExternalLink href={item.link}>{linkLabel}</ExternalLink>
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>About</Trans>
                      </div>
                      <div>{item.about}</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Creator</Trans>
                      </div>
                      <div>
                        <ExternalLink href={item.creatorLink}>{item.creatorLabel}</ExternalLink>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <PageTitle
            showNetworkIcon={false}
            title={t`Partnerships and Integrations`}
            subtitle={t`Projects integrated with GMX.`}
          />
          <div className="Ecosystem-projects">
            {integrations.map((item) => {
              const linkLabel = item.linkLabel ? item.linkLabel : item.link;
              return (
                <div key={item.title} className="App-card">
                  <div className="App-card-title">
                    {item.title}
                    <div className="App-card-title-icon">
                      {item.chainIds.map((network) => (
                        <img width="16" key={network} src={NETWORK_ICONS[network]} alt={NETWORK_ICON_ALTS[network]} />
                      ))}
                    </div>
                  </div>
                  <div className="App-card-divider"></div>
                  <div className="App-card-content">
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Link</Trans>
                      </div>
                      <div>
                        <ExternalLink href={item.link}>{linkLabel}</ExternalLink>
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>About</Trans>
                      </div>
                      <div>{item.about}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <PageTitle showNetworkIcon={false} title={t`Telegram Groups`} subtitle={t`Community-led Telegram groups.`} />
          <div className="Ecosystem-projects">
            {telegramGroups.map((item) => {
              const linkLabel = item.linkLabel ? item.linkLabel : item.link;
              return (
                <div className="App-card" key={item.title}>
                  <div className="App-card-title">{item.title}</div>
                  <div className="App-card-divider"></div>
                  <div className="App-card-content">
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Link</Trans>
                      </div>
                      <div>
                        <ExternalLink href={item.link}>{linkLabel}</ExternalLink>
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>About</Trans>
                      </div>
                      <div>{item.about}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <Footer />
      </div>
    </SEO>
  );
}
