import { useMedia } from "react-use";

import { Curtain } from "./Curtain";
import { TradeBox } from "./TradeBox";
import { TradeBoxHeaderTabs } from "./TradeBoxHeaderTabs";

export function TradeBoxResponsiveContainer() {
  const isMobile = useMedia("(max-width: 1100px)");

  if (!isMobile) {
    return (
      <div className="text-body-medium flex flex-col rounded-8 bg-slate-800" data-qa="tradebox">
        <TradeBoxHeaderTabs />
        <TradeBox isMobile={isMobile} />
      </div>
    );
  }

  return (
    <Curtain header={<TradeBoxHeaderTabs isInCurtain />} dataQa="tradebox">
      <TradeBox isMobile={isMobile} />
    </Curtain>
  );
}
