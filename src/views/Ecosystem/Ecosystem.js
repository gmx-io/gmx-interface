import React from "react";
import SEO from "../../components/Common/SEO";

import Footer from "../../Footer";
import { getPageTitle } from "../../Helpers";

import arbitrumIcon from "../../img/ic_arbitrum_16.svg";
import avalancheIcon from "../../img/ic_avalanche_16.svg";

import "./Ecosystem.css";

export default function Ecosystem() {
  return (
    <SEO title={getPageTitle("Ecosystem Projects")}>
      <div className="DashboardV2 Page page-layout">
        <div>
          <div className="Page-title-section">
            <div className="Page-title">Official Pages</div>
            <div className="Page-description">Official GMX ecosystem pages.</div>
          </div>
          <div className="DashboardV2-projects">
            <div className="App-card">
              <div className="App-card-title">GMX Governance</div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Link</div>
                  <div>
                    <a href="https://gov.gmx.io/" target="_blank" rel="noopener noreferrer">
                      https://gov.gmx.io/
                    </a>
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">About</div>
                  <div>GMX Governance page</div>
                </div>
              </div>
            </div>
            <div className="App-card">
              <div className="App-card-title">
                GMX Stats
                <div className="App-card-title-icon">
                  <img src={arbitrumIcon} alt="arbitrumIcon" />
                  <img src={avalancheIcon} alt="avalancheIcon" />
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Link</div>
                  <div>
                    <a href="https://stats.gmx.io/" target="_blank" rel="noopener noreferrer">
                      https://stats.gmx.io/
                    </a>
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">About</div>
                  <div>GMX Stats page</div>
                </div>
              </div>
            </div>
            <div className="App-card">
              <div className="App-card-title">GMX Proposals Voting</div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Link</div>
                  <div>
                    <a href="https://snapshot.org/#/gmx.eth" target="_blank" rel="noopener noreferrer">
                      https://snapshot.org/#/gmx.eth
                    </a>
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">About</div>
                  <div>GMX Proposals Voting page</div>
                </div>
              </div>
            </div>
          </div>
          <div className="Page-title-section">
            <div className="Page-title">Community Projects</div>
            <div className="Page-description">Projects developed by the GMX community.</div>
          </div>
          <div className="DashboardV2-projects">
            <div className="App-card">
              <div className="App-card-title">
                GMX Blueberry Club
                <div className="App-card-title-icon">
                  <img src={arbitrumIcon} alt="arbitrumIcon" />
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Link</div>
                  <div>
                    <a href="https://www.blueberry.club/" target="_blank" rel="noopener noreferrer">
                      https://www.blueberry.club
                    </a>
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">About</div>
                  <div>GMX Blueberry NFTs</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Creator</div>
                  <div>
                    <a href="https://t.me/xm92boi" target="_blank" rel="noopener noreferrer">
                      @xm92boi
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div className="App-card">
              <div className="App-card-title">
                GMX Leaderboard
                <div className="App-card-title-icon">
                  <img src={arbitrumIcon} alt="arbitrumIcon" />
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Link</div>
                  <div>
                    <a href="https://www.gmx.house/" target="_blank" rel="noopener noreferrer">
                      https://www.gmx.house
                    </a>
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">About</div>
                  <div>Leaderboard for GMX traders</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Creator</div>
                  <div>
                    <a href="https://t.me/Itburnz" target="_blank" rel="noopener noreferrer">
                      @Itburnz
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div className="App-card">
              <div className="App-card-title">
                GMX Positions Bot
                <div className="App-card-title-icon">
                  <img src={arbitrumIcon} alt="arbitrumIcon" />
                  <img src={avalancheIcon} alt="avalancheIcon" />
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Link</div>
                  <div>
                    <a href="https://t.me/GMXPositions" target="_blank" rel="noopener noreferrer">
                      https://t.me/GMXPositions
                    </a>
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">About</div>
                  <div>Telegram bot for GMX position updates</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Creator</div>
                  <div>
                    <a href="https://t.me/zhongfu" target="_blank" rel="noopener noreferrer">
                      @zhongfu
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div className="App-card">
              <div className="App-card-title">
                GMX Terminal
                <div className="App-card-title-icon">
                  <img src={arbitrumIcon} alt="arbitrumIcon" />
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Link</div>
                  <div>
                    <a href="https://gmxterminal.com/" target="_blank" rel="noopener noreferrer">
                      https://gmxterminal.com
                    </a>
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">About</div>
                  <div>GMX explorer for stats and traders</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Creator</div>
                  <div>
                    <a href="https://t.me/vipineth" target="_blank" rel="noopener noreferrer">
                      @vipineth
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div className="App-card">
              <div className="App-card-title">
                GMX Analytics
                <div className="App-card-title-icon">
                  <img src={arbitrumIcon} alt="arbitrumIcon" />
                  <img src={avalancheIcon} alt="avalancheIcon" />
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Link</div>
                  <div>
                    <a href="https://www.gmxstats.com/" target="_blank" rel="noopener noreferrer">
                      https://www.gmxstats.com/
                    </a>
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">About</div>
                  <div>Financial reports and protocol analytics</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Creator</div>
                  <div>
                    <a href="https://t.me/LarpCapital" target="_blank" rel="noopener noreferrer">
                      @CryptoMessiah
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div className="App-card">
              <div className="App-card-title">
                GMX Charts
                <div className="App-card-title-icon">
                  <img src={arbitrumIcon} alt="arbitrumIcon" />
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Link</div>
                  <div>
                    <a href="https://app.tokenfeeds.info/gmx-chart" target="_blank" rel="noopener noreferrer">
                      https://app.tokenfeeds.info/gmx-chart
                    </a>
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">About</div>
                  <div>GMX price and staking charts</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Creator</div>
                  <div>
                    <a href="https://t.me/atomist" target="_blank" rel="noopener noreferrer">
                      @atomist
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div className="App-card">
              <div className="App-card-title">
                GMX Yield Simulator
                <div className="App-card-title-icon">
                  <img src={arbitrumIcon} alt="arbitrumIcon" />
                  <img src={avalancheIcon} alt="avalancheIcon" />
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Link</div>
                  <div>
                    <a href="http://gmx.defisims.com/" target="_blank" rel="noopener noreferrer">
                      http://gmx.defisims.com/
                    </a>
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">About</div>
                  <div>Yield simulator for GMX</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Creator</div>
                  <div>
                    <a href="https://twitter.com/s0berknight" target="_blank" rel="noopener noreferrer">
                      s0berknight
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div className="App-card">
              <div className="App-card-title">
                GMX Returns Calculator
                <div className="App-card-title-icon">
                  <img src={arbitrumIcon} alt="arbitrumIcon" />
                  <img src={avalancheIcon} alt="avalancheIcon" />
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Link</div>
                  <div>
                    <a
                      href="https://docs.google.com/spreadsheets/u/4/d/1mQZlztz_NpTg5qQiYIzc_Ls1OTLfMOUtmEQN-WW8jj4/copy"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Google Spreadsheet
                    </a>
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">About</div>
                  <div>Returns calculator for GMX and GLP</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Creator</div>
                  <div>
                    <a href="https://twitter.com/AStoicTrader1" target="_blank" rel="noopener noreferrer">
                      Marcus.Crypto
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div className="App-card">
              <div className="App-card-title">
                GMX Compound Calculator
                <div className="App-card-title-icon">
                  <img src={avalancheIcon} alt="avalancheIcon" />
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Link</div>
                  <div>
                    <a
                      href="https://docs.google.com/spreadsheets/d/14DiIE1wZkK9-Y5xSx1PzIgmpcj4ccz1YVw5nwzIWLgI/edit#gid=0"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Google Spreadsheet
                    </a>
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">About</div>
                  <div>Optimal compound interval calculator</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Creator</div>
                  <div>
                    <a
                      href="https://twitter.com/ChasenKaminsky/status/1485820753173962753"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      chasenk.eth
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div className="App-card">
              <div className="App-card-title">
                GMX Feedback
                <div className="App-card-title-icon">
                  <img src={arbitrumIcon} alt="arbitrumIcon" />
                  <img src={avalancheIcon} alt="avalancheIcon" />
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Link</div>
                  <div>
                    <a href="https://gmx-fider.herokuapp.com" target="_blank" rel="noopener noreferrer">
                      https://gmx-fider.herokuapp.com
                    </a>
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">About</div>
                  <div>GMX feedback and feature requests</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Creator</div>
                  <div>
                    <a href="https://t.me/sevpants" target="_blank" rel="noopener noreferrer">
                      @sevpants
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="Page-title-section">
            <div className="Page-title">Partnerships and Integrations</div>
            <div className="Page-description">Projects supporting GMX.</div>
          </div>
          <div className="DashboardV2-projects">
            <div className="App-card">
              <div className="App-card-title">
                DeBank
                <div className="App-card-title-icon">
                  <img src={arbitrumIcon} alt="arbitrumIcon" />
                  <img src={avalancheIcon} alt="avalancheIcon" />
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Link</div>
                  <div>
                    <a href="https://debank.com/" target="_blank" rel="noopener noreferrer">
                      https://debank.com/
                    </a>
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">About</div>
                  <div>DeFi portfolio tracker</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Announcement</div>
                  <div>
                    <a
                      href="https://twitter.com/GMX_IO/status/1439711532884152324"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      https://twitter.com
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div className="App-card">
              <div className="App-card-title">
                DODO
                <div className="App-card-title-icon">
                  <img src={arbitrumIcon} alt="arbitrumIcon" />
                  <img src={avalancheIcon} alt="avalancheIcon" />
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Link</div>
                  <div>
                    <a href="https://dodoex.io/" target="_blank" rel="noopener noreferrer">
                      https://dodoex.io/
                    </a>
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">About</div>
                  <div>Decentralized Trading Protocol</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Announcement</div>
                  <div>
                    <a
                      href="https://twitter.com/GMX_IO/status/1438899138549145605"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      https://twitter.com
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div className="App-card">
              <div className="App-card-title">
                Yield Yak
                <div className="App-card-title-icon">
                  <img src={arbitrumIcon} alt="arbitrumIcon" />
                  <img src={avalancheIcon} alt="avalancheIcon" />
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Link</div>
                  <div>
                    <a href="https://yieldyak.com/" target="_blank" rel="noopener noreferrer">
                      https://yieldyak.com/
                    </a>
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">About</div>
                  <div>Yield Optimizer on Avalanche</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Announcement</div>
                  <div>
                    <a
                      href="https://twitter.com/GMX_IO/status/1484601407378378754"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      https://twitter.com
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div className="App-card">
              <div className="App-card-title">
                Open Ocean
                <div className="App-card-title-icon">
                  <img src={arbitrumIcon} alt="arbitrumIcon" />
                  <img src={avalancheIcon} alt="avalancheIcon" />
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Link</div>
                  <div>
                    <a href="https://openocean.finance/" target="_blank" rel="noopener noreferrer">
                      https://openocean.finance/
                    </a>
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">About</div>
                  <div>DEX Aggregator</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Announcement</div>
                  <div>
                    <a
                      href="https://twitter.com/GMX_IO/status/1495780826016989191"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      https://twitter.com
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div className="App-card">
              <div className="App-card-title">
                Dopex
                <div className="App-card-title-icon">
                  <img src={arbitrumIcon} alt="arbitrumIcon" />
                  <img src={avalancheIcon} alt="avalancheIcon" />
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Link</div>
                  <div>
                    <a href="https://dopex.io" target="_blank" rel="noopener noreferrer">
                      https://dopex.io
                    </a>
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">About</div>
                  <div>Decentralized Options Protocol</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Announcement</div>
                  <div>
                    <a
                      href="https://twitter.com/GMX_IO/status/1482445801523716099"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      https://twitter.com
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div className="App-card">
              <div className="App-card-title">
                Jones DAO
                <div className="App-card-title-icon">
                  <img src={arbitrumIcon} alt="arbitrumIcon" />
                  <img src={avalancheIcon} alt="avalancheIcon" />
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Link</div>
                  <div>
                    <a href="https://jonesdao.io" target="_blank" rel="noopener noreferrer">
                      https://jonesdao.io
                    </a>
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">About</div>
                  <div>Decentralized Options Strategies</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Announcement</div>
                  <div>
                    <a
                      href="https://twitter.com/GMX_IO/status/1482788805635678212"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      https://twitter.com
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div className="App-card">
              <div className="App-card-title">
                Defi Pulse
                <div className="App-card-title-icon">
                  <img src={arbitrumIcon} alt="arbitrumIcon" />
                  <img src={avalancheIcon} alt="avalancheIcon" />
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Link</div>
                  <div>
                    <a href="https://defipulse.com" target="_blank" rel="noopener noreferrer">
                      https://defipulse.com
                    </a>
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">About</div>
                  <div>Decentralized Finance Dashboard</div>
                </div>
              </div>
            </div>
            <div className="App-card">
              <div className="App-card-title">
                Defi Llama
                <div className="App-card-title-icon">
                  <img src={arbitrumIcon} alt="arbitrumIcon" />
                  <img src={avalancheIcon} alt="avalancheIcon" />
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Link</div>
                  <div>
                    <a href="https://defillama.com" target="_blank" rel="noopener noreferrer">
                      https://defillama.com
                    </a>
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">About</div>
                  <div>Decentralized Finance Dashboard</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Announcement</div>
                  <div>
                    <a
                      href="https://twitter.com/GMX_IO/status/1438124768033660938"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      https://twitter.com
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </SEO>
  );
}
