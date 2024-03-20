import { ClaimAction } from "domain/synthetics/claimHistory";
import { ClaimCollateralHistoryRow } from "./ClaimCollateralHistoryRow";
import { ClaimFundingFeesHistoryRow } from "./ClaimFundingFeesHistoryRow";

import "./ClaimHistoryRow.scss";

type ClaimHistoryRowProps = {
  claimAction: ClaimAction;
};

export function ClaimHistoryRow({ claimAction }: ClaimHistoryRowProps) {
  return claimAction.type === "collateral" ? (
    <ClaimCollateralHistoryRow claimAction={claimAction} />
  ) : (
    <ClaimFundingFeesHistoryRow claimAction={claimAction} />
  );
}
