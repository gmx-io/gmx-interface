import { t, Trans } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { getConstant } from "config/chains";
import { useChainId } from "lib/chains";
import { USD_DECIMALS } from "lib/legacy";
import { formatAmount, formatAmountFree } from "lib/numbers";

type Fee = { label: string; value: string };
type ExecutionFees = { fee?: bigint; feeUsd?: bigint };
type FeeType = "open" | "close" | "swap" | "borrow" | "deposit" | "execution";

function getFeeLabel(type: FeeType) {
  const labels = {
    close: t`Close Fee`,
    open: t`Open Fee`,
    swap: t`Swap Fee`,
    borrow: t`Borrow Fee`,
    deposit: t`Deposit Fee`,
    execution: t`Network Fee`,
  };
  return labels[type];
}

function getExecutionFeeStr(chainId, executionFee, executionFeeUsd) {
  const nativeTokenSymbol = getConstant(chainId, "nativeTokenSymbol");

  if (!nativeTokenSymbol || !executionFee || !executionFeeUsd) {
    return "";
  }

  const formattedExecutionFee = formatAmountFree(executionFee, 18, 5);
  const formattedExecutionFeeUsd = formatAmount(executionFeeUsd, USD_DECIMALS, 2);
  return `${formattedExecutionFee} ${nativeTokenSymbol} ($${formattedExecutionFeeUsd})`;
}

function getFeesStr(fees: bigint | undefined): string {
  if (fees === undefined || (fees ?? 0n) <= 0) {
    return "";
  }
  return `$${formatAmount(fees, USD_DECIMALS, 2, true)}`;
}

function getFeesRows(isOpening: boolean, formattedFees: Record<string, string | undefined>) {
  const rows: Fee[] = [];

  function addFeeRow(label: FeeType, value: string | undefined) {
    rows.push({ label: getFeeLabel(label), value: value ?? "" });
  }

  if (isOpening) {
    addFeeRow("swap", formattedFees?.swap);
    addFeeRow("open", formattedFees?.position);
    addFeeRow("borrow", formattedFees?.fundingRate || formattedFees?.funding);
  } else {
    addFeeRow("borrow", formattedFees?.fundingRate || formattedFees?.funding);
    addFeeRow("close", formattedFees?.position);
    addFeeRow("swap", formattedFees?.swap);
  }

  addFeeRow("deposit", formattedFees?.deposit);
  addFeeRow("execution", formattedFees?.execution);

  return rows.filter((row) => row.value);
}

function getTotalFees(fees: (bigint | undefined)[]) {
  return fees.reduce((acc: bigint, fee) => {
    if (fee === undefined) {
      return acc;
    }
    return acc + fee;
  }, 0n);
}

type Props = {
  executionFees: ExecutionFees;
  positionFee?: bigint;
  depositFee?: bigint;
  swapFee?: bigint;
  fundingFee?: bigint;
  fundingRate?: string;
  isOpening?: boolean;
  titleText?: string;
};

function FeesTooltip({
  fundingFee,
  positionFee,
  swapFee,
  executionFees,
  depositFee,
  fundingRate,
  isOpening = true,
  titleText = "",
}: Props) {
  const { chainId } = useChainId();
  const executionFee = executionFees?.fee;
  const executionFeeUsd = executionFees?.feeUsd;
  const formattedFees = {
    swap: getFeesStr(swapFee),
    position: getFeesStr(positionFee),
    deposit: getFeesStr(depositFee),
    execution: getExecutionFeeStr(chainId, executionFee, executionFeeUsd),
    funding: getFeesStr(fundingFee),
    fundingRate,
  };

  const feesRows = getFeesRows(isOpening, formattedFees);
  const totalFees = getTotalFees([executionFees?.feeUsd, swapFee, positionFee, depositFee, fundingFee]);

  return (
    <Tooltip
      position="top-end"
      className="PositionSeller-fees-tooltip"
      handle={<div>{totalFees > 0 ? `$${formatAmount(totalFees, USD_DECIMALS, 2, true)}` : "-"}</div>}
      renderContent={() => (
        <div>
          {titleText && <p>{titleText}</p>}
          {feesRows.map(({ label, value }) => (
            <StatsTooltipRow key={label} label={label} showDollar={false} value={value} />
          ))}
          <br />
          <div className="PositionSeller-fee-item">
            <Trans>
              <ExternalLink href="https://docs.gmx.io/docs/trading/v1#fees">Read more</ExternalLink> about fees.
            </Trans>
          </div>
        </div>
      )}
    />
  );
}

export default FeesTooltip;
