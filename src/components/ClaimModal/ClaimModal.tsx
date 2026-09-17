import { Trans, t } from "@lingui/macro";
import { useCallback, useMemo, useState } from "react";
import { toast } from "react-toastify";

import { TOAST_AUTO_CLOSE_TIME } from "config/ui";
import { useMarketsInfoData, useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectGmxAccountGasPaymentToken } from "context/SyntheticsStateContext/selectors/expressSelectors";
import { selectGmxAccountGasPaymentTokenAddress } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  ArbitraryExpressError,
  useArbitraryError,
  useArbitraryRelayParamsAndPayload,
} from "domain/multichain/arbitraryRelayParams";
import { ExpressTransactionBuilder, RawRelayParamsPayload } from "domain/synthetics/express";
import { useGasPrice } from "domain/synthetics/fees";
import {
  GMX_ACCOUNT_NETWORK_FEE_SOURCE,
  WALLET_NETWORK_FEE_SOURCE,
  type NetworkFeeDetails,
  type NetworkFeeSource,
} from "domain/synthetics/fees/networkFeeSource";
import {
  MarketInfo,
  getIsFundingClaimInsufficientBalance,
  getMarketIndexName,
  getMarketPoolName,
} from "domain/synthetics/markets";
import {
  buildAndSignClaimFundingFeesTxn,
  claimFundingFeesTxn,
  estimateClaimFundingFeesGas,
} from "domain/synthetics/markets/claimFundingFeesTxn";
import { convertToUsd, getMidPrice } from "domain/synthetics/tokens";
import { getInsufficientFeeButtonMessage } from "domain/synthetics/trade/utils/validation";
import { useChainId } from "lib/chains";
import { parseError } from "lib/errors";
import { helperToast } from "lib/helperToast";
import { metrics } from "lib/metrics";
import { formatDeltaUsd, formatTokenAmount } from "lib/numbers";
import { useJsonRpcProvider } from "lib/rpc";
import { sendExpressTransaction } from "lib/transactions";
import { getPageOutdatedError, useHasOutdatedUi } from "lib/useHasOutdatedUi";
import { usePrevious } from "lib/usePrevious";
import { useThrottledAsync } from "lib/useThrottledAsync";
import useWallet from "lib/wallets/useWallet";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { getToken } from "sdk/configs/tokens";
import { nowInSeconds } from "sdk/utils/time";

import { AlertInfo } from "components/AlertInfo/AlertInfo";
import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import { getTxnErrorToast } from "components/Errors/errorToasts";
import { InsufficientGmxAccountGasTokenBalanceMessage } from "components/Errors/gasErrors";
import { calculateNetworkFeeDetails } from "components/GmxAccountModal/calculateNetworkFeeDetails";
import Modal from "components/Modal/Modal";
import { SimpleNetworkFeeRow } from "components/NetworkFeeRow/SimpleNetworkFeeRow";
import Tooltip from "components/Tooltip/Tooltip";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import CheckCircleIcon from "img/ic_check_circle.svg?react";
import CloseCircleIcon from "img/ic_close_circle.svg?react";
import SpinnerIcon from "img/ic_spinner.svg?react";

import { ClaimFundingSelection, useClaimableFunding, useClaimableFundingSelection } from "./useClaimableFunding";

import "./ClaimModal.scss";

type Props = {
  isVisible: boolean;
  onClose: () => void;
  setPendingTxns: (txns: any) => void;
};

type ClaimNetworkFee = {
  details: NetworkFeeDetails | undefined;
  isLoading: boolean;
  source: NetworkFeeSource;
  isExpress: boolean;
};

export function getClaimingFundingToastContent() {
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="text-typography-secondary">
        <Trans>Claiming...</Trans>
      </div>
      <SpinnerIcon className="spin size-15 shrink-0 text-typography-primary" />
    </div>
  );
}

export function getClaimFundingSuccessToastContent() {
  return (
    <div className="flex items-center justify-between gap-6">
      <div>{t`Funding fees claimed`}</div>
      <CheckCircleIcon className="size-15 shrink-0 text-green-500" />
    </div>
  );
}

export function getClaimFundingFailureToastContent() {
  return (
    <div className="flex items-center justify-between gap-6">
      <div>{t`Claiming funding fees failed`}</div>
      <CloseCircleIcon className="size-15 shrink-0 text-red-500" />
    </div>
  );
}

export function ClaimModal(p: Props) {
  const { isVisible, onClose, setPendingTxns } = p;
  const { srcChainId } = useChainId();

  if (srcChainId === undefined) {
    return <ClaimModalSettlementChain isVisible={isVisible} onClose={onClose} setPendingTxns={setPendingTxns} />;
  } else {
    return <ClaimModalMultichain isVisible={isVisible} onClose={onClose} setPendingTxns={setPendingTxns} />;
  }
}

function ClaimModalSettlementChain(p: Props) {
  const { isVisible, onClose, setPendingTxns } = p;
  const { account, signer } = useWallet();
  const { chainId } = useChainId();
  const hasOutdatedUi = useHasOutdatedUi();
  const tokensData = useTokensData();
  const gasPrice = useGasPrice(chainId);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const selection = useClaimableFundingSelection(isVisible);

  const gasEstimationParams = useMemo(() => {
    if (!isVisible || !account || selection.selectedEntries.length === 0) {
      return undefined;
    }

    return {
      chainId,
      account,
      marketAddresses: selection.selectedEntries.map((entry) => entry.marketAddress),
      tokenAddresses: selection.selectedEntries.map((entry) => entry.tokenAddress),
    };
  }, [account, chainId, isVisible, selection.selectedEntries]);

  const gasEstimationKey = gasEstimationParams
    ? gasEstimationParams.marketAddresses
        .map((market, i) => `${market}:${gasEstimationParams.tokenAddresses[i]}`)
        .join("|")
    : undefined;
  const prevGasEstimationKey = usePrevious(gasEstimationKey);

  const gasLimitAsyncResult = useThrottledAsync(
    async ({ params }) =>
      estimateClaimFundingFeesGas(params.chainId, {
        account: params.account,
        marketAddresses: params.marketAddresses,
        tokenAddresses: params.tokenAddresses,
      }),
    {
      params: gasEstimationParams,
      forceRecalculate: gasEstimationKey !== undefined && gasEstimationKey !== prevGasEstimationKey,
      resetOnForceRecalculate: true,
      leading: true,
      trailing: true,
    }
  );

  const networkFee = useMemo(
    (): ClaimNetworkFee => ({
      details: calculateNetworkFeeDetails({ gasLimit: gasLimitAsyncResult.data, gasPrice, tokensData }),
      isLoading:
        gasEstimationParams !== undefined &&
        gasLimitAsyncResult.data === undefined &&
        gasLimitAsyncResult.error === undefined,
      source: WALLET_NETWORK_FEE_SOURCE,
      isExpress: false,
    }),
    [gasEstimationParams, gasLimitAsyncResult.data, gasLimitAsyncResult.error, gasPrice, tokensData]
  );

  const onSubmit = useCallback(() => {
    if (!account || !signer) return;
    if (selection.selectedEntries.length === 0) return;

    setIsSubmitting(true);

    claimFundingFeesTxn(chainId, signer, {
      account,
      fundingFees: {
        marketAddresses: selection.selectedEntries.map((entry) => entry.marketAddress),
        tokenAddresses: selection.selectedEntries.map((entry) => entry.tokenAddress),
      },
      setPendingTxns,
    })
      .then(onClose)
      .finally(() => setIsSubmitting(false));
  }, [account, chainId, onClose, selection.selectedEntries, setPendingTxns, signer]);

  const buttonState = useMemo(() => {
    if (hasOutdatedUi) {
      return {
        text: getPageOutdatedError(),
        disabled: true,
      };
    }

    if (isSubmitting) {
      return {
        text: t`Claiming...`,
        disabled: true,
      };
    }

    if (networkFee.isLoading) {
      return {
        text: t`Loading fees...`,
        disabled: true,
      };
    }

    return {
      text: t`Claim`,
      onClick: onSubmit,
    };
  }, [isSubmitting, onSubmit, hasOutdatedUi, networkFee.isLoading]);

  return (
    <ClaimModalComponent
      isVisible={isVisible}
      onClose={onClose}
      buttonState={buttonState}
      selection={selection}
      networkFee={networkFee}
    />
  );
}

function ClaimModalMultichain(p: Props) {
  const { isVisible, onClose } = p;
  const { account, signer } = useWallet();
  const { chainId, srcChainId } = useChainId();
  const { provider } = useJsonRpcProvider(chainId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasOutdatedUi = useHasOutdatedUi();
  const selection = useClaimableFundingSelection(isVisible);

  const expressTransactionBuilder: ExpressTransactionBuilder | undefined = useMemo(() => {
    if (!account || !signer || !provider || selection.selectedEntries.length === 0 || isSubmitting) {
      return undefined;
    }

    return async (params) => {
      const txnData = await buildAndSignClaimFundingFeesTxn({
        chainId,
        markets: selection.selectedEntries.map((entry) => entry.marketAddress),
        tokens: selection.selectedEntries.map((entry) => entry.tokenAddress),
        receiver: account,
        account,
        signer,
        relayParams: {
          ...(params.relayParams as RawRelayParamsPayload),
          deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
        },
        relayerFeeAmount: params.gasPaymentParams.relayerFeeAmount,
        relayerFeeTokenAddress: params.gasPaymentParams.relayerFeeTokenAddress,
        emptySignature: true,
      });

      return {
        txnData,
      };
    };
  }, [account, chainId, isSubmitting, provider, selection.selectedEntries, signer]);

  const isGmxAccountClaim = srcChainId !== undefined;
  const expressTxnParamsAsyncResult = useArbitraryRelayParamsAndPayload({
    expressTransactionBuilder,
    isGmxAccount: isGmxAccountClaim,
  });

  const errors = useArbitraryError(expressTxnParamsAsyncResult.error, { isGmxAccount: isGmxAccountClaim });
  const gmxAccountGasPaymentToken = useSelector(selectGmxAccountGasPaymentToken);
  const gmxAccountGasPaymentTokenAddress = useSelector(selectGmxAccountGasPaymentTokenAddress);

  const networkFee = useMemo((): ClaimNetworkFee => {
    const gasPaymentParams = expressTxnParamsAsyncResult.data?.gasPaymentParams;
    const token = gasPaymentParams?.gasPaymentToken ?? gmxAccountGasPaymentToken;
    const amount =
      errors?.isOutOfTokenError?.isGasPaymentToken && errors.isOutOfTokenError.requiredAmount !== undefined
        ? errors.isOutOfTokenError.requiredAmount
        : gasPaymentParams?.gasPaymentTokenAmount;

    const details: NetworkFeeDetails | undefined =
      token && amount !== undefined
        ? {
            amount,
            usd: convertToUsd(amount, token.decimals, getMidPrice(token.prices))!,
            decimals: token.decimals,
            symbol: token.symbol,
            isStable: token.isStable,
          }
        : undefined;

    return {
      details,
      isLoading:
        details === undefined &&
        selection.selectedEntries.length > 0 &&
        expressTxnParamsAsyncResult.error === undefined,
      source: GMX_ACCOUNT_NETWORK_FEE_SOURCE,
      isExpress: true,
    };
  }, [
    errors?.isOutOfTokenError,
    expressTxnParamsAsyncResult.data,
    expressTxnParamsAsyncResult.error,
    gmxAccountGasPaymentToken,
    selection.selectedEntries.length,
  ]);

  const onSubmit = useCallback(() => {
    const onMissingParams = () => {
      helperToast.error(t`Missing claim params. Retry in a few seconds`);
      metrics.pushError(new Error("No necessary params to claim"), "expressClaimFundingFees");
    };

    if (!account || !signer || !expressTxnParamsAsyncResult.promise || !provider) {
      onMissingParams();
      return;
    }

    setIsSubmitting(true);

    expressTxnParamsAsyncResult.promise
      .then(async (expressTxnParams) => {
        if (!expressTxnParams) {
          onMissingParams();
          return;
        }

        const txnData = await buildAndSignClaimFundingFeesTxn({
          chainId,
          markets: selection.selectedEntries.map((entry) => entry.marketAddress),
          tokens: selection.selectedEntries.map((entry) => entry.tokenAddress),
          receiver: account,
          signer,
          account,
          relayParams: {
            ...(expressTxnParams.relayParamsPayload as RawRelayParamsPayload),
            deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
          },
          relayerFeeAmount: expressTxnParams.gasPaymentParams.relayerFeeAmount,
          relayerFeeTokenAddress: expressTxnParams.gasPaymentParams.relayerFeeTokenAddress,
        });

        const request = await sendExpressTransaction({
          chainId,
          txnData,
        });

        helperToast.info(getClaimingFundingToastContent(), {
          autoClose: false,
          toastId: "funding-claimed",
        });
        request.wait().then((res) => {
          if (res.status === "success") {
            toast.update("funding-claimed", {
              render: getClaimFundingSuccessToastContent(),
              type: "success",
              autoClose: TOAST_AUTO_CLOSE_TIME,
            });
          } else if (res.status === "failed") {
            toast.update("funding-claimed", {
              render: getClaimFundingFailureToastContent(),
              type: "error",
              autoClose: TOAST_AUTO_CLOSE_TIME,
            });
          }
        });

        onClose();
      })
      .catch((error) => {
        const errorData = parseError(error);

        if (errorData?.isUserRejectedError) {
          return;
        }

        metrics.pushError(error, "expressClaimFundingFees");

        const toastParams = getTxnErrorToast(chainId, errorData, {
          defaultMessage: getClaimFundingFailureToastContent(),
          expressFee: { gasPaymentTokenAddress: gmxAccountGasPaymentTokenAddress, isGmxAccount: true },
        });
        helperToast.error(toastParams.errorContent, { autoClose: toastParams.autoCloseToast });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }, [
    account,
    chainId,
    expressTxnParamsAsyncResult.promise,
    gmxAccountGasPaymentTokenAddress,
    onClose,
    provider,
    selection.selectedEntries,
    signer,
  ]);

  const buttonState = useMemo(() => {
    if (hasOutdatedUi) {
      return {
        text: getPageOutdatedError(),
        disabled: true,
      };
    }

    if (isSubmitting) {
      return {
        text: t`Claiming...`,
        disabled: true,
      };
    }

    if (errors?.isOutOfTokenError?.isGasPaymentToken) {
      return {
        text: getInsufficientFeeButtonMessage({
          tokenSymbol: getToken(chainId, gmxAccountGasPaymentTokenAddress).symbol,
          feeSource: GMX_ACCOUNT_NETWORK_FEE_SOURCE,
        }),
        disabled: true,
      };
    }

    if (expressTxnParamsAsyncResult.error) {
      return {
        text: t`Network fee unavailable`,
        disabled: true,
      };
    }

    if (!expressTxnParamsAsyncResult.data) {
      return {
        text: t`Loading fees...`,
        disabled: true,
      };
    }

    return {
      text: t`Claim`,
      onClick: onSubmit,
    };
  }, [
    hasOutdatedUi,
    isSubmitting,
    errors,
    chainId,
    gmxAccountGasPaymentTokenAddress,
    expressTxnParamsAsyncResult.data,
    expressTxnParamsAsyncResult.error,
    onSubmit,
  ]);

  return (
    <ClaimModalComponent
      isVisible={isVisible}
      onClose={onClose}
      buttonState={buttonState}
      selection={selection}
      errors={errors}
      networkFee={networkFee}
    />
  );
}

function ClaimModalComponent(p: {
  isVisible: boolean;
  onClose: () => void;
  buttonState: { text: React.ReactNode; onClick?: () => void; disabled?: boolean };
  selection: ClaimFundingSelection;
  errors?: ArbitraryExpressError;
  networkFee: ClaimNetworkFee;
}) {
  const { isVisible, onClose, buttonState, selection, errors, networkFee } = p;

  const { chainId } = useChainId();
  const marketsInfoData = useMarketsInfoData();

  const markets = useMemo(() => (isVisible ? Object.values(marketsInfoData || {}) : []), [isVisible, marketsInfoData]);

  const { totalClaimableFundingUsd, hasInsufficientBalance, allInsufficient } = useClaimableFunding(markets);

  const selectedFundingUsd = useMemo(() => {
    let total = 0n;
    for (const entry of selection.selectedEntries) {
      const market = marketsInfoData?.[entry.marketAddress];
      if (!market) continue;
      const isLong = entry.tokenAddress === market.longTokenAddress;
      const token = isLong ? market.longToken : market.shortToken;
      const amount = isLong ? market.claimableFundingAmountLong : market.claimableFundingAmountShort;
      total += convertToUsd(amount, token.decimals, token.prices.minPrice) ?? 0n;
    }
    return total;
  }, [marketsInfoData, selection.selectedEntries]);

  const effectiveButtonState = useMemo(() => {
    if (allInsufficient) return { text: t`Insufficient pool balance`, disabled: true };
    if (selection.selectedEntries.length === 0) return { text: t`Select at least one market`, disabled: true };
    return buttonState;
  }, [allInsufficient, buttonState, selection.selectedEntries.length]);

  function renderMarketSection(market: MarketInfo) {
    const indexName = getMarketIndexName(market);
    const poolName = getMarketPoolName(market);
    const longToken = market.longToken;
    const shortToken = market.shortToken;

    const fundingLongAmount = market.claimableFundingAmountLong;
    const fundingShortAmount = market.claimableFundingAmountShort;

    const fundingLongUsd = convertToUsd(fundingLongAmount, longToken?.decimals, longToken?.prices?.minPrice);
    const fundingShortUsd = convertToUsd(fundingShortAmount, shortToken?.decimals, shortToken?.prices?.minPrice);

    const totalFundingUsd = (fundingLongUsd ?? 0n) + (fundingShortUsd ?? 0n);

    if (totalFundingUsd <= 0) return null;
    const isDisabledMarket = market.isDisabled;

    const longInsufficient = getIsFundingClaimInsufficientBalance(market, true);
    const shortInsufficient = getIsFundingClaimInsufficientBalance(market, false);
    const isMarketInsufficient =
      (longInsufficient && shortInsufficient) ||
      (longInsufficient && (fundingShortUsd ?? 0n) === 0n) ||
      (shortInsufficient && (fundingLongUsd ?? 0n) === 0n);

    const claimableAmountsItems: string[] = [];

    if (fundingLongAmount !== undefined) {
      claimableAmountsItems.push(
        formatTokenAmount(fundingLongAmount, longToken.decimals, longToken.symbol, { isStable: longToken.isStable })!
      );
    }

    if (fundingShortAmount !== undefined) {
      claimableAmountsItems.push(
        formatTokenAmount(fundingShortAmount, shortToken.decimals, shortToken.symbol, {
          isStable: shortToken.isStable,
        })!
      );
    }

    const labelContent = (
      <div className="ClaimSettleModal-row-text flex items-start">
        <span>{indexName}</span>
        {poolName ? <span className="subtext">[{poolName}]</span> : null}
      </div>
    );

    const rowLabel = isDisabledMarket ? (
      <TooltipWithPortal
        position="top-start"
        handle={labelContent}
        content={<Trans>This market has been disabled. Contact support to claim your remaining funding fees.</Trans>}
      />
    ) : (
      labelContent
    );

    const isSelected = selection.isRowSelected(market.marketTokenAddress);
    const isToggleable = selection.isRowToggleable(market.marketTokenAddress);
    const eligibleEntriesCount =
      selection.rows.find((row) => row.marketTokenAddress === market.marketTokenAddress)?.eligibleEntries.length ?? 0;
    const checkboxDisabled = eligibleEntriesCount === 0 || !isToggleable;

    return (
      <div
        key={market.marketTokenAddress}
        className={`ClaimSettleModal-info-row ${isMarketInsufficient ? "opacity-50" : ""}`}
      >
        <Checkbox
          isChecked={isSelected}
          setIsChecked={() => selection.toggleRow(market.marketTokenAddress)}
          disabled={checkboxDisabled}
          className="ClaimSettleModal-checkbox flex self-center"
        >
          <div className="Exchange-info-label ClaimSettleModal-checkbox-label">{rowLabel}</div>
        </Checkbox>
        <div className="ClaimSettleModal-info-label-usd">
          <Tooltip
            className="ClaimSettleModal-tooltip"
            position="top-end"
            handle={
              <span className={isMarketInsufficient ? "text-yellow-500" : undefined}>
                {formatDeltaUsd(totalFundingUsd)}
              </span>
            }
            renderContent={() => (
              <>
                {claimableAmountsItems.map((item) => (
                  <div key={item}>{item}</div>
                ))}
                {isMarketInsufficient && (
                  <div className="mt-5 text-yellow-500">
                    <Trans>Insufficient pool balance to claim this funding fee</Trans>
                  </div>
                )}
              </>
            )}
          />
        </div>
      </div>
    );
  }

  const claimAmountText =
    selectedFundingUsd < totalClaimableFundingUsd ? (
      <Trans>
        Claim <span>{formatDeltaUsd(selectedFundingUsd)}</span> of{" "}
        <span>{formatDeltaUsd(totalClaimableFundingUsd)}</span>
      </Trans>
    ) : (
      <Trans>
        Claim <span>{formatDeltaUsd(totalClaimableFundingUsd)}</span>
      </Trans>
    );

  return (
    <Modal
      className="Confirmation-box ClaimableModal"
      isVisible={p.isVisible}
      setIsVisible={onClose}
      label={t`Confirm claim`}
    >
      <div className="ConfirmationBox-main">
        <div className="text-center">{claimAmountText}</div>
      </div>
      <div className="mb-20 mt-15 h-1 bg-slate-700" />
      {selection.isLimitReached && (
        <AlertInfoCard type="info" hideClose className="mb-15">
          <Trans>
            Maximum claim entries selected. Claim this batch first, then claim the remaining fees in another transaction
            to avoid oversized wallet confirmations.
          </Trans>
        </AlertInfoCard>
      )}
      <div className="ClaimSettleModal-info-row">
        <div className="flex pl-22">
          <div className="Exchange-info-label ClaimSettleModal-checkbox-label">
            <div className="flex items-start">
              <Trans>MARKET</Trans>
            </div>
          </div>
        </div>
        <div className="ClaimSettleModal-info-label-usd">
          <Tooltip
            className="ClaimSettleModal-tooltip-text-gray"
            position="top-end"
            handle={t`FUNDING FEE`}
            renderContent={() => (
              <Trans>
                <span className="text-typography-primary">Positive funding fees accrued from your positions</span>
              </Trans>
            )}
          />
        </div>
      </div>
      <div className="ClaimModal-content">{markets.map(renderMarketSection)}</div>
      {hasInsufficientBalance && (
        <AlertInfo type="warning" compact className="mb-15">
          <Trans>
            Some markets have insufficient pool balance to claim funding fees. These markets are excluded from this
            claim.
          </Trans>
        </AlertInfo>
      )}
      {errors?.isOutOfTokenError?.isGasPaymentToken && (
        <AlertInfoCard type="error" hideClose className="mb-15">
          <InsufficientGmxAccountGasTokenBalanceMessage
            chainId={chainId}
            gasPaymentTokenAddress={errors.isOutOfTokenError.tokenAddress}
            onBeforeNavigation={onClose}
          />
        </AlertInfoCard>
      )}
      <SimpleNetworkFeeRow
        className="mb-15"
        details={selection.selectedEntries.length > 0 ? networkFee.details : undefined}
        isLoading={networkFee.isLoading}
        source={networkFee.source}
        isExpress={networkFee.isExpress}
      />
      <Button
        className="w-full"
        variant="primary-action"
        onClick={effectiveButtonState.onClick}
        disabled={effectiveButtonState.disabled}
      >
        {effectiveButtonState.text}
      </Button>
    </Modal>
  );
}
