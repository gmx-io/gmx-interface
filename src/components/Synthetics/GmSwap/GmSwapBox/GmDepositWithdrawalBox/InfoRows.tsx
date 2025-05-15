import { ExecutionFee } from "domain/synthetics/fees";
import { GmSwapFees } from "domain/synthetics/trade";

import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import { GmFees } from "components/Synthetics/GmSwap/GmFees/GmFees";
import { NetworkFeeRow } from "components/Synthetics/NetworkFeeRow/NetworkFeeRow";

import { GmSwapWarningsRow } from "../GmSwapWarningsRow";
import { Operation } from "../types";

export function InfoRows({
  isDeposit,
  fees,
  executionFee,
  isSingle,

  shouldShowWarning,
  shouldShowWarningForPosition,
  shouldShowWarningForExecutionFee,
  isAccepted,
  setIsAccepted,
}: {
  isDeposit: boolean;
  fees: GmSwapFees | undefined;
  executionFee: ExecutionFee | undefined;
  isSingle: boolean;

  shouldShowWarning: boolean;
  shouldShowWarningForPosition: boolean;
  shouldShowWarningForExecutionFee: boolean;
  isAccepted: boolean;
  setIsAccepted: (val: boolean) => void;
}) {
  return (
    <ExchangeInfo className="GmSwapBox-info-section" dividerClassName="App-card-divider">
      <ExchangeInfo.Group>
        <div className="GmSwapBox-info-section">
          <GmFees
            operation={isDeposit ? Operation.Deposit : Operation.Withdrawal}
            totalFees={fees?.totalFees}
            swapFee={fees?.swapFee}
            swapPriceImpact={fees?.swapPriceImpact}
            uiFee={fees?.uiFee}
          />
          <NetworkFeeRow rowPadding executionFee={executionFee} />
        </div>
      </ExchangeInfo.Group>

      <GmSwapWarningsRow
        isSingle={isSingle}
        isAccepted={isAccepted}
        shouldShowWarning={shouldShowWarning}
        shouldShowWarningForPosition={shouldShowWarningForPosition}
        shouldShowWarningForExecutionFee={shouldShowWarningForExecutionFee}
        setIsAccepted={setIsAccepted}
      />
    </ExchangeInfo>
  );
}
