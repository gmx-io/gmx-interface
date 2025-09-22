import { t } from "@lingui/macro";
import { ReactNode } from "react";
import { useLocation } from "react-router-dom";

import { SyntheticsStateContextProvider } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import Button from "components/Button/Button";
import PageTitle from "components/PageTitle/PageTitle";
import { ChainContentHeader } from "components/Synthetics/ChainContentHeader/ChainContentHeader";

export type EarnTabValue = "discovery" | "portfolio" | "additional-opportunities" | "distribution";

type EarnPageLayoutProps = {
  children?: ReactNode;
};

export default function EarnPageLayout({ children }: EarnPageLayoutProps) {
  const { pathname } = useLocation();

  const tabOptions = [
    { value: "discovery" as const, label: t`Discover` },
    { value: "portfolio" as const, label: t`Portfolio` },
    { value: "additional-opportunities" as const, label: t`Additional Opportunities` },
    { value: "distribution" as const, label: t`Distribution` },
  ];

  return (
    <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="earn">
      <AppPageLayout header={<ChainContentHeader />}>
        <div>
          <PageTitle title={t`Earn`} subtitle={t`Stake GMX and buy GLV or GM to earn rewards.`} isTop />

          <div className="mt-20 flex flex-col gap-8">
            <div className="flex flex-wrap gap-8">
              {tabOptions.map((tab) => (
                <Button
                  key={tab.value}
                  variant={pathname.startsWith(`/earn/${tab.value}`) ? "primary" : "secondary"}
                  to={`/earn/${tab.value}`}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            {children ? <div className="flex flex-col gap-8">{children}</div> : null}
          </div>
        </div>
      </AppPageLayout>
    </SyntheticsStateContextProvider>
  );
}
