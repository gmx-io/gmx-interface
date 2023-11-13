import { Trans } from "@lingui/macro";
import "./AppHomeContent.css";
import liquidationImage from "img/liquidation_risks.svg";
import saveCostImg from "img/save_costs.svg";
import simpleSwapImg from "img/swaps.svg";

export default function AppHomeContent() {
  return (
    <div className="landing-content">
      <div className="content-title">
        <img src={liquidationImage} alt="liquidation risk" width={45} />
        <Trans>Reduce Liquidation Risks</Trans>
        <br />
        <span className="content-desc">
          An aggregate of high-quality price feeds determine when liquidations occur. This keeps positions safe from
          temporary wicks.
        </span>
      </div>
      <div className="content-title">
        <img src={saveCostImg} alt="liquidation risk" width={45} />
        <Trans>Save on Costs</Trans>
        <br />
        <span className="content-desc">
          Enter and exit positions with minimal spread and low price impact. Get the optimal price without incurring
          additional costs.
        </span>
      </div>
      <div className="content-title">
        <img src={simpleSwapImg} alt="liquidation risk" width={45} />
        <Trans>Simple Swaps</Trans>
        <br />
        <span className="content-desc">
          Open positions through a simple swap interface. Conveniently swap from any supported asset into the position
          of your choice.
        </span>
      </div>
    </div>
  );
}
