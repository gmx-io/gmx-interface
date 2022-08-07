import { formatAmount, USD_DECIMALS } from "../../Helpers";

export default function TooltipCard({ title, total, avax, arbitrum }) {
  return (
    <>
      <p className="Tooltip-row">
        <span className="label">{title} on Arbitrum:</span>
        <span>${formatAmount(arbitrum, USD_DECIMALS, 0, true)}</span>
      </p>
      <p className="Tooltip-row">
        <span className="label">{title} on Avalanche:</span>
        <span>${formatAmount(avax, USD_DECIMALS, 0, true)}</span>
      </p>
      <div className="Tooltip-divider" />
      <p className="Tooltip-row">
        <span className="label">Total:</span>
        <span>${formatAmount(total, USD_DECIMALS, 0, true)}</span>
      </p>
    </>
  );
}

export function TooltipCardRow({ label, amount, showDollar = true }) {
  return (
    <p className="Tooltip-row">
      <span className="label">{label}:</span>
      <span className="amount">
        {showDollar && "$"}
        {amount}
      </span>
    </p>
  );
}
