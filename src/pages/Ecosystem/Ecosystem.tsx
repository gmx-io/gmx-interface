import { t, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { memo } from "react";

import { AnyChainId, getChainName } from "config/chains";
import { getChainIcon } from "config/icons";
import { getPageTitle } from "lib/seo";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import ExternalLink from "components/ExternalLink/ExternalLink";
import PageTitle from "components/PageTitle/PageTitle";
import SEO from "components/Seo/SEO";

import { communityProjects, dashboardProjects, gmxPages, integrations, telegramGroups } from "./ecosystemConstants";

import "./Ecosystem.css";

const Chains = memo(function Chains({ chainIds }: { chainIds: AnyChainId[] }) {
  return (
    <div className="flex shrink-0">
      {chainIds.map((chainId, index, array) => (
        <img
          key={chainId}
          className="-ml-4 w-20 first-of-type:ml-0"
          width="20"
          src={getChainIcon(chainId)}
          alt={getChainName(chainId)}
          // Safety: this chain ids never change + memo makes so that this component never re-renders
          // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
          style={{ zIndex: array.length - index }}
        />
      ))}
    </div>
  );
});

export default function Ecosystem() {
  const { _ } = useLingui();

  return (
    <AppPageLayout>
      <SEO title={getPageTitle(t`Ecosystem Projects`)}>
        <div className="default-container page-layout">
          <div className="flex flex-col gap-20">
            <PageTitle isTop title={t`GMX Pages`} subtitle={t`GMX ecosystem pages.`} qa="ecosystem-page" />
            <div className="Ecosystem-projects">
              {gmxPages.map((item) => {
                const linkLabel = item.linkLabel ? item.linkLabel : item.link;
                return (
                  <div className="App-card" key={item.title.id}>
                    <div className="App-card-title">
                      {_(item.title)}
                      <Chains chainIds={item.chainIds} />
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
                      <Chains chainIds={item.chainIds} />
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
            <PageTitle title={t`Dashboards`} subtitle={t`GMX dashboards and analytics.`} />
            <div className="Ecosystem-projects">
              {dashboardProjects.map((item) => {
                const linkLabel = item.linkLabel ? item.linkLabel : item.link;
                return (
                  <div className="App-card" key={item.title.id}>
                    <div className="App-card-title">
                      {_(item.title)}
                      <Chains chainIds={item.chainIds} />
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
            <PageTitle title={t`Partnerships and Integrations`} subtitle={t`Projects integrated with GMX.`} />
            <div className="Ecosystem-projects">
              {integrations.map((item) => {
                const linkLabel = item.linkLabel ? item.linkLabel : item.link;
                return (
                  <div key={item.title.id} className="App-card">
                    <div className="App-card-title">
                      {_(item.title)}
                      <Chains chainIds={item.chainIds} />
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
                <ExternalLink href="https://www.tradingview.com/symbols/BTCUSD/">BTCUSD</ExternalLink> price in
                real-time, along with other currency pair rates. The interactive charts offer advanced tools and a
                user-friendly interface for easier market analysis and decision-making.
              </Trans>
            </div>
            <PageTitle title={t`Telegram Groups`} subtitle={t`Community-led Telegram groups.`} />
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
        </div>
      </SEO>
    </AppPageLayout>
  );
}
