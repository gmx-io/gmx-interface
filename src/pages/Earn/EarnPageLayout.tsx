import { t, Trans } from "@lingui/macro";
import { ReactNode, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";

import { LAST_EARN_TAB_KEY } from "config/localStorage";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { sendEarnPageTabViewEvent, sendEarnPageViewEvent, EarnAnalyticsTab } from "lib/userAnalytics/earnEvents";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import Button from "components/Button/Button";
import { ChainContentHeader } from "components/ChainContentHeader/ChainContentHeader";
import PageTitle from "components/PageTitle/PageTitle";

export enum EarnTab {
  Discover = "discover",
  Portfolio = "portfolio",
  "AdditionalOpportunities" = "additional_opportunities",
  Distributions = "distributions",
}

export const EARN_TABS = Object.values(EarnTab);

export function isEarnTab(value: string | null): value is EarnTab {
  return typeof value === "string" && Object.values(EarnTab).includes(value as EarnTab);
}

const TAB_TO_ANALYTICS_MAP: Record<EarnTab, EarnAnalyticsTab> = {
  [EarnTab.Discover]: "discover",
  [EarnTab.Portfolio]: "portfolio",
  [EarnTab.AdditionalOpportunities]: "additionalOpportunities",
  [EarnTab.Distributions]: "distributions",
};

type EarnPageLayoutProps = {
  children?: ReactNode;
};

export default function EarnPageLayout({ children }: EarnPageLayoutProps) {
  const { pathname } = useLocation();

  const tabOptions = useMemo(
    () => [
      { value: EarnTab.Discover, label: <Trans>Discover</Trans> },
      { value: EarnTab.Portfolio, label: <Trans>Portfolio</Trans> },
      { value: EarnTab.AdditionalOpportunities, label: <Trans>Additional Opportunities</Trans> },
      { value: EarnTab.Distributions, label: <Trans>Distributions</Trans> },
    ],
    []
  );

  const activeTabValue = useMemo(() => {
    const match = tabOptions.find((tab) => pathname.startsWith(`/earn/${tab.value}`));
    return match?.value;
  }, [pathname, tabOptions]);

  const analyticsTab = useMemo(
    () => (activeTabValue ? TAB_TO_ANALYTICS_MAP[activeTabValue] : undefined),
    [activeTabValue]
  );

  const [, setLastEarnTab] = useLocalStorageSerializeKey<EarnTab | undefined>(LAST_EARN_TAB_KEY, undefined);

  useEffect(() => {
    if (!activeTabValue || typeof window === "undefined" || !isEarnTab(activeTabValue)) {
      return;
    }

    setLastEarnTab(activeTabValue);
  }, [activeTabValue, setLastEarnTab]);

  useEffect(() => {
    if (!analyticsTab) {
      return;
    }

    sendEarnPageViewEvent(analyticsTab);
    sendEarnPageTabViewEvent(analyticsTab);
  }, [analyticsTab]);

  return (
    <AppPageLayout header={<ChainContentHeader />}>
      <PageTitle title={t`Earn`} subtitle={t`Stake GMX and buy GLV or GM to earn rewards.`} isTop />

      <div className="mt-12 flex grow flex-col gap-8">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-8">
            {tabOptions.map((tab) => (
              <Button
                key={tab.value}
                variant={pathname.startsWith(`/earn/${tab.value}`) ? "primary" : "secondary"}
                to={`/earn/${tab.value}`}
                className="shrink-0"
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        {children ? <div className="flex grow flex-col gap-8">{children}</div> : null}
      </div>
    </AppPageLayout>
  );
}
