import { i18n } from "@lingui/core";
import { t, Trans } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { getConstant } from "config/chains";
import { BigNumber, BigNumberish } from "ethers";
import { useChainId } from "lib/chains";
import { USD_DECIMALS } from "lib/legacy";
import { formatAmount, formatAmountFree } from "lib/numbers";

type Fee = { label: string; value: string };
type ExecutionFee = { fee?: BigNumberish; feeUSD?: BigNumberish };
type FeeType = "open" | "close" | "swap" | "borrow" | "deposit" | "execution";

function getFeeLabel(type: FeeType) {
  const labels = {
    close: t`Close Fee`,
    open: t`Open Fee`,
    swap: t`Swap Fee`,
    borrow: t`Borrow Fee`,
    deposit: t`Deposit Fee`,
    execution: t`Execution Fee`,
  };

  return i18n._(labels[type]);
}

function getExecutionFeeStr(chainId, executionFee, executionFeeUsd) {
  const nativeTokenSymbol = getConstant(chainId, "nativeTokenSymbol");

  if (!nativeTokenSymbol || !executionFee || !executionFeeUsd) {
    return "";
  }

  const formattedExecutionFee = formatAmountFree(executionFee, 18, 4);
  const formattedExecutionFeeUsd = formatAmount(executionFeeUsd, USD_DECIMALS, 2);
  return `${formattedExecutionFee} ${nativeTokenSymbol} ($${formattedExecutionFeeUsd})`;
}

function getFeesStr(fees: BigNumber | undefined): string {
  if (!fees || !BigNumber.from(fees).gt(0)) {
    return "";
  }
  return `$${formatAmount(fees, USD_DECIMALS, 2, true)}`;
}

function getFeesRows(isOpening: boolean, formattedFees: Record<string, string>) {
  const rows: Fee[] = [];

  function addFeeRow(label: FeeType, value: string) {
    rows.push({ label: getFeeLabel(label), value });
  }

  if (isOpening) {
    addFeeRow("swap", formattedFees?.swap);
    addFeeRow("open", formattedFees?.position);
    addFeeRow("borrow", formattedFees?.funding);
  } else {
    addFeeRow("borrow", formattedFees?.funding);
    addFeeRow("close", formattedFees?.position);
    addFeeRow("swap", formattedFees?.swap);
  }

  addFeeRow("deposit", formattedFees?.deposit);
  addFeeRow("execution", formattedFees?.execution);

  return rows.filter((row) => row.value);
}

type Props = {
  totalFees: BigNumber;
  executionFees: ExecutionFee;
  positionFee?: BigNumber;
  depositFee?: BigNumber;
  swapFee?: BigNumber;
  fundingFee?: string;
  isOpening?: boolean;
};

function FeesTooltip({
  totalFees,
  fundingFee,
  positionFee,
  swapFee,
  executionFees,
  depositFee,
  isOpening = true,
}: Props) {
  const { chainId } = useChainId();
  const executionFee = executionFees?.fee;
  const executionFeeUSD = executionFees?.feeUSD;

  const formattedFees = {
    swap: getFeesStr(swapFee),
    position: getFeesStr(positionFee),
    deposit: getFeesStr(depositFee),
    execution: getExecutionFeeStr(chainId, executionFee, executionFeeUSD),
    funding: fundingFee || "",
  };

  let feesRows = getFeesRows(isOpening, formattedFees);

  return (
    <Tooltip
      position="right-top"
      className="PositionSeller-fees-tooltip"
      handle={<div>{totalFees?.gt(0) ? `$${formatAmount(totalFees, USD_DECIMALS, 2, true)}` : "-"}</div>}
      renderContent={() => (
        <div>
          {feesRows.map(({ label, value }) => (
            <StatsTooltipRow key={label} label={label} showDollar={false} value={value} />
          ))}
          <br />
          <div className="PositionSeller-fee-item">
            <Trans>
              <ExternalLink href="https://gmxio.gitbook.io/gmx/trading#fees">More Info</ExternalLink> about fees.
            </Trans>
          </div>
        </div>
      )}
    />
  );
}

export default FeesTooltip;
