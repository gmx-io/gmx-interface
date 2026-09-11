import { useId } from "react";

import { useBreakpoints } from "lib/useBreakpoints";

import { ActiveFormScope } from "components/ActiveFormScope/ActiveFormScope";
import ErrorBoundary from "components/Errors/ErrorBoundary";
import { TradeRewardsPromoBanner } from "components/RewardsPromoBanner/TradeRewardsPromoBanner";

import { Curtain } from "./Curtain";
import { TradeBox } from "./TradeBox";
import { TradeBoxHeaderTabs } from "./TradeBoxHeaderTabs";

export function TradeBoxResponsiveContainer() {
  const { isTablet } = useBreakpoints();
  const formId = useId();

  if (!isTablet) {
    return (
      <div className="text-body-medium flex flex-col rounded-8" data-qa="tradebox">
        <TradeBoxHeaderTabs />
        <ActiveFormScope formId={formId}>
          <ErrorBoundary id="TradeBox" variant="block">
            <TradeBox isMobile={isTablet} activeFormId={formId} />
          </ErrorBoundary>
        </ActiveFormScope>
      </div>
    );
  }

  return (
    <Curtain header={<TradeBoxHeaderTabs isInCurtain />} dataQa="tradebox" hideChevron headerHeight={48}>
      <ActiveFormScope formId={formId}>
        <ErrorBoundary id="TradeBox" variant="block">
          <TradeBox isMobile={isTablet} activeFormId={formId} />
        </ErrorBoundary>
      </ActiveFormScope>
      <TradeRewardsPromoBanner className="mt-auto p-8" />
    </Curtain>
  );
}
