import { isSourceChain } from "config/multichain";
import { getArbitraryRelayParamsAndPayload, getRawBaseRelayerParams } from "domain/multichain/arbitraryRelayParams";
import type {
  GasPaymentParams,
  GasPaymentValidations,
  MultichainRelayParamsPayload,
  RawMultichainRelayParamsPayload,
  RawRelayParamsPayload,
  RelayFeePayload,
  RelayParamsPayload,
} from "domain/synthetics/express";
import type { SubaccountValidations } from "domain/synthetics/subaccount";
import { EMPTY_OBJECT } from "lib/objects";
import type { ExternalCallsPayload } from "sdk/utils/orderTransactions";

import { createSelector } from "../utils";
import { selectExpressGlobalParams } from "./expressSelectors";
import { selectAccount, selectChainId, selectSrcChainId } from "./globalSelectors";

export const selectSourceChainId = createSelector((q) => {
  const chainId = q(selectSrcChainId);

  if (!chainId || !isSourceChain(chainId)) {
    return undefined;
  }

  return chainId;
});
/**
 * Just a dummy relay params payload with hardcoded fee
 */

export const selectRawBasePreparedRelayParamsPayload = createSelector<
  Partial<{
    rawBaseRelayParamsPayload: RawRelayParamsPayload | RawMultichainRelayParamsPayload | undefined;
    baseRelayFeeSwapParams: {
      feeParams: RelayFeePayload;
      externalCalls: ExternalCallsPayload;
      feeExternalSwapGasLimit: bigint;
      gasPaymentParams: GasPaymentParams;
    };
  }>
>((q) => {
  const chainId = q(selectChainId);
  const account = q(selectAccount);
  const globalExpressParams = q(selectExpressGlobalParams);

  if (!globalExpressParams || !account) {
    return EMPTY_OBJECT;
  }

  return getRawBaseRelayerParams({
    chainId,
    account,
    globalExpressParams,
  });
});

export const selectArbitraryRelayParamsAndPayload = createSelector(function selectArbitraruRelayParamsAndPayload(q):
  | ((dynamicFees: { relayerFeeAmount: bigint; additionalNetworkFee?: bigint; isGmxAccount: boolean }) => Partial<{
      relayFeeParams: {
        feeParams: RelayFeePayload;
        externalCalls: ExternalCallsPayload;
        feeExternalSwapGasLimit: bigint;
        gasPaymentParams: GasPaymentParams;
      };
      relayParamsPayload: RawRelayParamsPayload | RawMultichainRelayParamsPayload;
      latestParamsPayload: RelayParamsPayload | MultichainRelayParamsPayload;
      gasPaymentValidations: GasPaymentValidations;
      subaccountValidations: SubaccountValidations;
    }>)
  | undefined {
  const chainId = q(selectChainId);
  const account = q(selectAccount);
  const globalExpressParams = q(selectExpressGlobalParams);

  if (!account || !globalExpressParams) {
    return undefined;
  }

  return ({
    relayerFeeAmount,
    additionalNetworkFee,
    isGmxAccount,
  }: {
    relayerFeeAmount: bigint;
    additionalNetworkFee?: bigint;
    isGmxAccount: boolean;
  }) => {
    return getArbitraryRelayParamsAndPayload({
      chainId,
      account,
      isGmxAccount,
      relayerFeeAmount,
      additionalNetworkFee,
      globalExpressParams: globalExpressParams,
    });
  };
});
