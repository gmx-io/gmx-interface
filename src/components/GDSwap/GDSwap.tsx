import "./GlpSwap.css";

import { GDMarketInfo } from "./GDMarketInfo/GDMarketInfo";
import { GDSwapBox } from "./GDSwapBox/GDSwapBox";

export function GDSwap() {
  return (
    <div className="GDSwap">
      <GDMarketInfo />
      <GDSwapBox />
    </div>
  );
}
