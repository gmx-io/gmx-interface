import React from "react";
import SEO from "../../components/Common/SEO";
import "./Ecosystem.css";

import Footer from "../../Footer";
import { getPageTitle, ARBITRUM, AVALANCHE } from "../../Helpers";

import arbitrumIcon from "../../img/ic_arbitrum_16.svg";
import avalancheIcon from "../../img/ic_avalanche_16.svg";

function getImage(name) {
  let image;
  try {
    image = require("../../img/" + name);
  } catch (error) {
    image = require("../../img/" + "gmx-logo-final.png");
    console.error(error);
  }
  return image && image.default;
}

const NETWORK_ICONS = {
  [ARBITRUM]: arbitrumIcon,
  [AVALANCHE]: avalancheIcon,
};

const NETWORK_ICON_ALTS = {
  [ARBITRUM]: "Arbitrum Icon",
  [AVALANCHE]: "Avalanche Icon",
};

export default function Ecosystem() {
  const officialPages = [
    {
      title: "GMX Governance",
      link: "https://gov.gmx.io/",
      about: "GMX Governance page",
      chainIds: [ARBITRUM, AVALANCHE],
      icon: "ic_governance.svg",
    },
    {
      title: "GMX Stats",
      link: "https://stats.gmx.io/",
      about: "GMX Stats page",
      chainIds: [ARBITRUM, AVALANCHE],
      icon: "ic_GMXstats.svg",
    },
    {
      title: "GMX Proposals",
      link: "https://snapshot.org/#/gmx.eth",
      about: "GMX Proposals Voting page",
      chainIds: [ARBITRUM, AVALANCHE],
      icon: "ic_voting.svg",
    },
  ];

  const communityProjects = [
    {
      title: "GMX Blueberry Club",
      link: "https://www.blueberry.club/",
      about: "GMX Blueberry NFTs",
      creatorLabel: "@xm92boi",
      creatorLink: "https://t.me/xm92boi",
      chainIds: [ARBITRUM],
      icon: "ic_gbc.png",
    },
    {
      title: "GMX Leaderboard",
      link: "https://www.gmx.house/",
      about: "Leaderboard for GMX traders",
      creatorLabel: "@Itburnz",
      creatorLink: "https://t.me/Itburnz",
      chainIds: [ARBITRUM, AVALANCHE],
      icon: "ic_GMXLeaderboard.svg",
    },
    {
      title: "GMX Positions Bot",
      link: "https://t.me/GMXPositions",
      about: "Telegram bot for GMX position updates",
      creatorLabel: "@zhongfu",
      creatorLink: "https://t.me/zhongfu",
      chainIds: [ARBITRUM, AVALANCHE],
      icon: "ic_GMXPositionsBot.svg",
    },
    {
      title: "GMX Terminal",
      link: "https://gmxterminal.com",
      about: "GMX explorer for stats and traders",
      creatorLabel: "@vipineth",
      creatorLink: "https://t.me/vipineth",
      chainIds: [ARBITRUM],
      icon: "ic_GMXTerminal.svg",
    },
    {
      title: "GMX Analytics",
      link: "https://www.gmxstats.com/",
      about: "Financial reports and protocol analytics",
      creatorLabel: "@CryptoMessiah",
      creatorLink: "https://t.me/LarpCapital",
      chainIds: [ARBITRUM, AVALANCHE],
      icon: "ic_GMXAnalytics.svg",
    },
    {
      title: "GMX Yield Simulator",
      link: "https://gmx.defisims.com/",
      about: "Yield simulator for GMX",
      creatorLabel: "@s0berknight",
      creatorLink: "https://twitter.com/s0berknight",
      chainIds: [ARBITRUM, AVALANCHE],
      icon: "ic_GMXAnalytics.svg",
    },
    {
      title: "GMX Returns Calculator",
      link: "https://docs.google.com/spreadsheets/u/4/d/1mQZlztz_NpTg5qQiYIzc_Ls1OTLfMOUtmEQN-WW8jj4/copy",
      linkLabel: "Google Spreadsheet",
      about: "Returns calculator for GMX and GLP",
      creatorLabel: "@AStoicTrader1",
      creatorLink: "https://twitter.com/AStoicTrader1",
      chainIds: [ARBITRUM, AVALANCHE],
      icon: "ic_GMXReturnsCalculator.svg",
    },
    {
      title: "GMX Compound Calculator",
      link: "https://docs.google.com/spreadsheets/d/14DiIE1wZkK9-Y5xSx1PzIgmpcj4ccz1YVw5nwzIWLgI/edit#gid=0",
      linkLabel: "Google Spreadsheet",
      about: "Optimal compound interval calculator",
      creatorLabel: "@ChasenKaminsky",
      creatorLink: "https://twitter.com/ChasenKaminsky",
      chainIds: [AVALANCHE],
      icon: "ic_GMXCompoundCalculator.png",
    },
  ];

  const integrations = [
    {
      title: "DeBank",
      link: "https://debank.com/",
      about: "DeFi Portfolio Tracker",
      announcementLabel: "https://twitter.com",
      announcementLink: "https://twitter.com/GMX_IO/status/1439711532884152324",
      chainIds: [ARBITRUM, AVALANCHE],
      icon: "ic_debank.svg",
    },
    {
      title: "Defi Llama",
      link: "https://defillama.com",
      about: "Decentralized Finance Dashboard",
      announcementLabel: "https://twitter.com",
      announcementLink: "https://twitter.com/GMX_IO/status/1438124768033660938",
      chainIds: [ARBITRUM, AVALANCHE],
      icon: "ic_defillama.svg",
    },
    {
      title: "Dopex",
      link: "https://dopex.io",
      about: "Decentralized Options Protocol",
      announcementLabel: "https://twitter.com",
      announcementLink: "https://twitter.com/GMX_IO/status/1482445801523716099",
      chainIds: [ARBITRUM, AVALANCHE],
      icon: "ic_dopex.svg",
    },
    {
      title: "Jones DAO",
      link: "https://jonesdao.io",
      about: "Decentralized Options Strategies",
      announcementLabel: "https://twitter.com",
      announcementLink: "https://twitter.com/GMX_IO/status/1482788805635678212",
      chainIds: [ARBITRUM],
      icon: "ic_jonesdao.svg",
    },
    {
      title: "Yield Yak",
      link: "https://yieldyak.com/",
      about: "Yield Optimizer on Avalanche",
      announcementLabel: "https://twitter.com",
      announcementLink: "https://twitter.com/GMX_IO/status/1484601407378378754",
      chainIds: [AVALANCHE],
      icon: "ic_yak.png",
    },
    {
      title: "Vovo Finance",
      link: "https://vovo.finance/",
      about: "Structured Products",
      announcementLabel: "https://twitter.com",
      announcementLink: "https://twitter.com/VovoFinance/status/1531517177790345217",
      chainIds: [ARBITRUM],
      icon: "ic_vovo.svg",
    },
    {
      title: "DODO",
      link: "https://dodoex.io/",
      about: "Decentralized Trading Protocol",
      announcementLabel: "https://twitter.com",
      announcementLink: "https://twitter.com/GMX_IO/status/1438899138549145605",
      chainIds: [ARBITRUM, AVALANCHE],
      icon: "ic_dodo.svg",
    },
    {
      title: "Open Ocean",
      link: "https://openocean.finance/",
      about: "DEX Aggregator",
      announcementLabel: "https://twitter.com",
      announcementLink: "https://twitter.com/GMX_IO/status/1495780826016989191",
      chainIds: [ARBITRUM, AVALANCHE],
      icon: "ic_openocean.svg",
    },
  ];

  return (
    <SEO title={getPageTitle("Ecosystem Projects")}>
      <div className="default-container page-layout">
        <div>
          <div className="section-title-block">
            <div className="section-title-icon"></div>
            <div className="section-title-content">
              <div className="Page-title">Official Pages</div>
              <div className="Page-description">Official GMX ecosystem pages.</div>
            </div>
          </div>
          <div className="DashboardV2-projects">
            {officialPages.map((item) => {
              const linkLabel = item.linkLabel ? item.linkLabel : item.link;
              const image = getImage(item.icon);
              return (
                <div key={item.link} className="App-card">
                  <div className="App-card-title">
                    {item.title}
                    <div className="App-card-title-icon">
                      {item.chainIds.map((network) => (
                        <img key={network} src={NETWORK_ICONS[network]} alt={NETWORK_ICON_ALTS[network]} />
                      ))}
                    </div>
                  </div>
                  <div className="App-card-divider"></div>
                  <div className="App-card-content">
                    <img src={image} alt={item.title} width="50" />
                    <div className="App-card-rows">
                      <div className="App-card-row">
                        <div className="label">Link</div>
                        <div>
                          <a href={item.link} target="_blank" rel="noopener noreferrer">
                            {linkLabel}
                          </a>
                        </div>
                      </div>
                      <div className="App-card-row">
                        <div className="label">About</div>
                        <div>{item.about}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="Tab-title-section">
            <div className="Page-title">Community Projects</div>
            <div className="Page-description">Projects developed by the GMX community.</div>
          </div>
          <div className="DashboardV2-projects">
            {communityProjects.map((item) => {
              const linkLabel = item.linkLabel ? item.linkLabel : item.link;
              const image = getImage(item.icon);
              return (
                <div key={item.link} className="App-card">
                  <div className="App-card-title">
                    {item.title}
                    <div className="App-card-title-icon">
                      {item.chainIds.map((network) => (
                        <img key={network} src={NETWORK_ICONS[network]} alt={NETWORK_ICON_ALTS[network]} />
                      ))}
                    </div>
                  </div>
                  <div className="App-card-divider"></div>
                  <div className="App-card-content">
                    <img src={image} alt={item.title} width="50" />
                    <div className="App-card-rows">
                      <div className="App-card-row">
                        <div className="label">Link</div>
                        <div>
                          <a href={item.link} target="_blank" rel="noopener noreferrer">
                            {linkLabel}
                          </a>
                        </div>
                      </div>
                      <div className="App-card-row">
                        <div className="label">About</div>
                        <div>{item.about}</div>
                      </div>
                      <div className="App-card-row">
                        <div className="label">Creator</div>
                        <div>
                          <a href={item.creatorLink} target="_blank" rel="noopener noreferrer">
                            {item.creatorLabel}
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="Tab-title-section">
            <div className="Page-title">Partnerships and Integrations</div>
            <div className="Page-description">Projects integrated with GMX.</div>
          </div>
          <div className="DashboardV2-projects">
            {integrations.map((item) => {
              const linkLabel = item.linkLabel ? item.linkLabel : item.link;
              const image = getImage(item.icon);
              return (
                <div key={item.link} className="App-card">
                  <div className="App-card-title">
                    {item.title}
                    <div className="App-card-title-icon">
                      {item.chainIds.map((network) => (
                        <img key={network} src={NETWORK_ICONS[network]} alt={NETWORK_ICON_ALTS[network]} />
                      ))}
                    </div>
                  </div>
                  <div className="App-card-divider"></div>
                  <div className="App-card-content">
                    <img src={image} alt={item.title} width="50" />
                    <div className="App-card-rows">
                      <div className="App-card-row">
                        <div className="label">Link</div>
                        <div>
                          <a href={item.link} target="_blank" rel="noopener noreferrer">
                            {linkLabel}
                          </a>
                        </div>
                      </div>
                      <div className="App-card-row">
                        <div className="label">About</div>
                        <div>{item.about}</div>
                      </div>
                      <div className="App-card-row">
                        <div className="label">Announcement</div>
                        <div>
                          <a href={item.announcementLink} target="_blank" rel="noopener noreferrer">
                            {item.announcementLabel}
                          </a>
                        </div>
                      </div>
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
