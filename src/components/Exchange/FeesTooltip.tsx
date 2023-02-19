import { t, Trans } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { getConstant } from "config/chains";
import { BigNumberish } from "ethers";
import { useChainId } from "lib/chains";
import { USD_DECIMALS } from "lib/legacy";
import { formatAmount, formatAmountFree } from "lib/numbers";

type Row = {
  label: string;
  value: string;
};

function getExecutionFeeStr(chainId, executionFee, executionFeeUsd) {
  const nativeTokenSymbol = getConstant(chainId, "nativeTokenSymbol");

  if (!nativeTokenSymbol || !executionFee || !executionFeeUsd) {
    return "...";
  }

  const formattedExecutionFee = formatAmountFree(executionFee, 18, 4);
  const formattedExecutionFeeUsd = formatAmount(executionFeeUsd, USD_DECIMALS, 2);
  return `${formattedExecutionFee} ${nativeTokenSymbol} ($${formattedExecutionFeeUsd})`;
}

type Props = {
  totalFees: string;
  fundingFee: string;
  positionFee: string;
  depositFee: string;
  swapFee: string;
  executionFees: { fee: BigNumberish; feeUSD: BigNumberish };
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
  const SWAP_FEE_LABEL = t`Swap Fee`;
  const BORROW_FEE_LABEL = t`Borrow Fee`;
  const executionFee = executionFees?.fee;
  const executionFeeUSD = executionFees?.feeUSD;

  const feeRows: Row[] = [
    { label: isOpening ? SWAP_FEE_LABEL : BORROW_FEE_LABEL, value: isOpening ? swapFee : fundingFee },
    { label: isOpening ? t`Open Fee` : t`Close Fee`, value: positionFee },
    { label: isOpening ? BORROW_FEE_LABEL : SWAP_FEE_LABEL, value: isOpening ? fundingFee : swapFee },
    { label: t`Deposit Fee`, value: depositFee },
    { label: t`Execution Fee`, value: getExecutionFeeStr(chainId, executionFee, executionFeeUSD) },
  ]
    .filter((row) => row.value)
    .map(({ label, value }) => ({ label, value }));

  return (
    <Tooltip
      position="right-top"
      className="PositionSeller-fees-tooltip"
      handle={<div>{totalFees ? totalFees : "-"}</div>}
      renderContent={() => (
        <div>
          {feeRows.map(({ label, value }) => (
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
