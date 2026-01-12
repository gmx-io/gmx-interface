import { useBreakpoints } from "lib/useBreakpoints";

import ErrorBoundary from "components/Errors/ErrorBoundary";

import { Curtain } from "./Curtain";
import { TradeBox } from "./TradeBox";
import { TradeBoxHeaderTabs } from "./TradeBoxHeaderTabs";

export function TradeBoxResponsiveContainer() {
  const { isTablet } = useBreakpoints();

  if (!isTablet) {
    return (
      <div className="text-body-medium flex flex-col rounded-8" data-qa="tradebox">
        <TradeBoxHeaderTabs />
        <ErrorBoundary variant="block">
          <TradeBox isMobile={isTablet} />
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <Curtain header={<TradeBoxHeaderTabs isInCurtain />} dataQa="tradebox">
      <ErrorBoundary variant="block">
        <TradeBox isMobile={isTablet} />
      </ErrorBoundary>
    </Curtain>
  );
}
