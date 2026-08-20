import { useBreakpoints } from "lib/useBreakpoints";

import ErrorBoundary from "components/Errors/ErrorBoundary";
import { TradeRewardsPromoBanner } from "components/RewardsPromoBanner/TradeRewardsPromoBanner";

import { Curtain } from "./Curtain";
import { TradeBox } from "./TradeBox";
import { TradeBoxHeaderTabs } from "./TradeBoxHeaderTabs";

export function TradeBoxResponsiveContainer() {
  const { isTablet } = useBreakpoints();

  if (!isTablet) {
    return (
      <div className="flex flex-col gap-8">
        <div className="text-body-medium flex flex-col rounded-8" data-qa="tradebox">
          <TradeBoxHeaderTabs />
          <ErrorBoundary id="TradeBox" variant="block">
            <TradeBox isMobile={isTablet} />
          </ErrorBoundary>
        </div>
        <TradeRewardsPromoBanner />
      </div>
    );
  }

  return (
    <Curtain header={<TradeBoxHeaderTabs isInCurtain />} dataQa="tradebox" hideChevron headerHeight={48}>
      <ErrorBoundary id="TradeBox" variant="block">
        <TradeBox isMobile={isTablet} />
      </ErrorBoundary>
      <TradeRewardsPromoBanner className="mt-auto p-8" />
    </Curtain>
  );
}
