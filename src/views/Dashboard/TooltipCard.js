import { formatAmount, USD_DECIMALS } from "../../Helpers";

function TooltipCard({ title, total, avax, arbitrum, showDollar = true, decimalsForConversion = USD_DECIMALS }) {
  return (
    <>
      <p className="Tooltip-row">
        <span className="label">{title} on Arbitrum:</span>
        <span>
          {showDollar && "$"}
          {formatAmount(arbitrum, decimalsForConversion, 0, true)}
        </span>
      </p>
      <p className="Tooltip-row">
        <span className="label">{title} on Avalanche:</span>
        <span>
          {showDollar && "$"}
          {formatAmount(avax, decimalsForConversion, 0, true)}
        </span>
      </p>
      <div className="Tooltip-divider" />
      <p className="Tooltip-row">
        <span className="label">Total:</span>
        <span>
          {showDollar && "$"}
          {formatAmount(total, decimalsForConversion, 0, true)}
        </span>
      </p>
    </>
  );
}

export default TooltipCard;
