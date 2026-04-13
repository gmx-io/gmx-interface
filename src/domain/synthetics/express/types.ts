import type { TokensAllowanceData } from "domain/tokens";
import type { BuiltGlobalExpressParams } from "sdk/utils/express";

export type {
  BuiltGlobalExpressParams,
  ExpressParamsEstimationMethod,
  ExpressTransactionBuilder,
  ExpressTransactionEstimatorParams,
  ExpressTxnData,
  ExpressTxnParams,
  GasPaymentParams,
  GasPaymentValidations,
  OracleParamsPayload,
  RawRelayParamsPayload,
  RelayFeePayload,
  RelayParamsPayload,
  RelayParamsPayloadWithSignature,
  Subaccount,
  SubaccountValidations,
} from "sdk/utils/express";

export type GlobalExpressParams = BuiltGlobalExpressParams & {
  gasPaymentAllowanceData: TokensAllowanceData;
};
