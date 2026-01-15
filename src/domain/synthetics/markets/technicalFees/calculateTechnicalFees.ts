import { calculateGmxAccountTechnicalFees } from "./calculateGmxAccountTechnicalFees";
import { calculateSettlementChainTechnicalFees } from "./calculateSettlementChainTechnicalFees";
import { calculateSourceChainTechnicalFees } from "./calculateSourceChainTechnicalFees";
import { CalculateTechnicalFeesParams, TechnicalGmFees } from "./technical-fees-types";

export async function calculateTechnicalFees(
  params: CalculateTechnicalFeesParams
): Promise<TechnicalGmFees | undefined> {
  if (params.paySource === "settlementChain") {
    return calculateSettlementChainTechnicalFees(params);
  } else if (params.paySource === "gmxAccount") {
    return calculateGmxAccountTechnicalFees(params);
  } else if (params.paySource === "sourceChain") {
    return calculateSourceChainTechnicalFees(params);
  }
}
