import { formatAmount, USD_DECIMALS } from "../../Helpers";

function TooltipCard({ title, total, avax, arbitrum }) {
  return (
    <>
      <p className="tooltip-row">
        <span className="t-label">{title} on Arbitrum:</span>
        <span>${formatAmount(arbitrum, USD_DECIMALS, 0, true)}</span>
      </p>
      <p className="tooltip-row">
        <span className="t-label">{title} on Avalanche:</span>
        <span>${formatAmount(avax, USD_DECIMALS, 0, true)}</span>
      </p>
      <div className="divider" />
      <p className="tooltip-row">
        <span className="t-label">Total:</span>
        <span>${formatAmount(total, USD_DECIMALS, 0, true)}</span>
      </p>
    </>
  );
}

export default TooltipCard;
