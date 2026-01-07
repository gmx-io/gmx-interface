import { useBreakpoints } from "lib/useBreakpoints";

import { Curtain } from "./Curtain";
import { TradeBox } from "./TradeBox";
import { TradeBoxHeaderTabs } from "./TradeBoxHeaderTabs";

export function TradeBoxResponsiveContainer() {
  const { isTablet } = useBreakpoints();

  if (!isTablet) {
    return (
      <div className="text-body-medium flex flex-col rounded-8" data-qa="tradebox">
        <TradeBoxHeaderTabs />
        <TradeBox isMobile={isTablet} />
      </div>
    );
  }

  return (
    <Curtain header={<TradeBoxHeaderTabs isInCurtain />} dataQa="tradebox" hideChevron headerHeight={48}>
      <TradeBox isMobile={isTablet} />
    </Curtain>
  );
}
