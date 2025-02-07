import { Trans, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { getIcon } from "config/icons";
import { communityProjects, dashboardProjects, gmxPages, integrations, telegramGroups } from "./ecosystemConstants";
import { getPageTitle } from "lib/legacy";

import SEO from "components/Common/SEO";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Footer from "components/Footer/Footer";
import PageTitle from "components/PageTitle/PageTitle";

import "./Ecosystem.css";

const NETWORK_ICONS = {
  [ARBITRUM]: getIcon(ARBITRUM, "network"),
  [AVALANCHE]: getIcon(AVALANCHE, "network"),
};

const NETWORK_ICON_ALTS = {
  [ARBITRUM]: "Arbitrum Icon",
  [AVALANCHE]: "Avalanche Icon",
};

export default function Ecosystem() {
  const { _ } = useLingui();

  return (
    <SEO title={getPageTitle(t`Ecosystem Projects`)}>
      <div className="default-container page-layout">
        <div>
          <PageTitle
            showNetworkIcon={false}
            isTop
            title={t`GMX Pages`}
            subtitle={t`GMX ecosystem pages.`}
            qa="ecosystem-page"
          />
          <div className="Ecosystem-projects">
            {gmxPages.map((item) => {
              const linkLabel = item.linkLabel ? item.linkLabel : item.link;
              return (
                <div className="App-card" key={item.title.id}>
                  <div className="App-card-title">
                    {_(item.title)}
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
                      <div>{_(item.about)}</div>
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
                <div className="App-card" key={item.title.id}>
                  <div className="App-card-title">
                    {_(item.title)}
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
                      <div>{_(item.about)}</div>
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
                          <ExternalLink href={item.creatorLink as string}>{item.creatorLabel as string}</ExternalLink>
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
                <div className="App-card" key={item.title.id}>
                  <div className="App-card-title">
                    {_(item.title)}
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
                      <div>{_(item.about)}</div>
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
                <div key={item.title.id} className="App-card">
                  <div className="App-card-title">
                    {_(item.title)}
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
                      <div>{_(item.about)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-body-large mt-16">
            <Trans>
              GMX uses TradingView to provide real-time cryptocurrency charts, so you can easily follow{" "}
              <ExternalLink href="https://www.tradingview.com/symbols/BTCUSD/">BTCUSD</ExternalLink> price in real-time,
              along with other currency pair rates. The interactive charts offer advanced tools and a user-friendly
              interface for easier market analysis and decision-making.
            </Trans>
          </div>
          <PageTitle showNetworkIcon={false} title={t`Telegram Groups`} subtitle={t`Community-led Telegram groups.`} />
          <div className="Ecosystem-projects">
            {telegramGroups.map((item) => {
              const linkLabel = item.linkLabel ? item.linkLabel : item.link;
              return (
                <div className="App-card" key={item.title.id}>
                  <div className="App-card-title">{_(item.title)}</div>
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
                      <div>{_(item.about)}</div>
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
