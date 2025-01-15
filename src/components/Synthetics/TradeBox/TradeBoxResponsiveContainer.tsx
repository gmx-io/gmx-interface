import { useMedia } from "react-use";

import { Curtain } from "./Curtain";
import { TradeBox } from "./TradeBox";
import { TradeBoxHeaderTabs } from "./TradeBoxHeaderTabs";

export function TradeBoxResponsiveContainer() {
  const isMobile = useMedia("(max-width: 1100px)");

  if (!isMobile) {
    return (
      <div className="App-box rounded-4 p-15" data-qa="tradebox">
        <TradeBoxHeaderTabs />
        <TradeBox />
      </div>
    );
  }

  return (
    <Curtain header={<TradeBoxHeaderTabs isInCurtain />} dataQa="tradebox">
      <TradeBox isInCurtain />
    </Curtain>
  );
}
