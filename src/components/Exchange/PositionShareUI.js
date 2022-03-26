import { formatAmount, USD_DECIMALS } from "../../Helpers";
import "./SharePosition.css";

function PositionShareUI({ position, shareImg }) {
  let { averagePrice, markPrice, deltaPercentageStr, isLong, indexToken } = position;
  let isPnLPositive = parseInt(deltaPercentageStr || "") > 0;
  return (
    <div className="container">
      {/* <img width="200" src="https://github.com/vipineth/gmx-assets/blob/main/PNG/GMX%20LIGHT.png?raw=true" alt="" /> */}
      <div className="trade-details">
        <div className={isLong ? "LONG" : "SHORT"}>LONG</div> <span>|</span>
        <div>{indexToken.symbol} Perpetual</div>
      </div>
      <div className={isPnLPositive ? "profit" : "loss"}>{deltaPercentageStr}</div>
      <div className="price">
        <p>
          Entry Price: <span>${formatAmount(averagePrice, USD_DECIMALS, 2, true)}</span>
        </p>
        <p>
          Current Price: <span>${formatAmount(markPrice, USD_DECIMALS, 2, true)}</span>
        </p>
      </div>
    </div>
  );
}

export default PositionShareUI;
