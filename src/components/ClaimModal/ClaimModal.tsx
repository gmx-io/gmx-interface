import { Trans, t } from "@lingui/macro";
import { useCallback, useMemo, useState } from "react";
import { toast } from "react-toastify";

import { TOAST_AUTO_CLOSE_TIME } from "config/ui";
import { useMarketsInfoData, useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  ArbitraryExpressError,
  useArbitraryError,
  useArbitraryRelayParamsAndPayload,
} from "domain/multichain/arbitraryRelayParams";
import { ExpressTransactionBuilder, RawRelayParamsPayload } from "domain/synthetics/express";
import {
  MarketInfo,
  getIsFundingClaimInsufficientBalance,
  getMarketIndexName,
  getMarketPoolName,
} from "domain/synthetics/markets";
import { buildAndSignClaimFundingFeesTxn, claimFundingFeesTxn } from "domain/synthetics/markets/claimFundingFeesTxn";
import { TokenData, convertToUsd } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { metrics } from "lib/metrics";
import { formatDeltaUsd, formatTokenAmount } from "lib/numbers";
import { getByKey } from "lib/objects";
import { useJsonRpcProvider } from "lib/rpc";
import { sendExpressTransaction } from "lib/transactions";
import { getPageOutdatedError, useHasOutdatedUi } from "lib/useHasOutdatedUi";
import useWallet from "lib/wallets/useWallet";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { nowInSeconds } from "sdk/utils/time";

import { AlertInfo } from "components/AlertInfo/AlertInfo";
import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import Modal from "components/Modal/Modal";
import { OutOfTokenErrorAlert } from "components/Referrals/shared/modals/OutOfTokenErrorAlert";
import Tooltip from "components/Tooltip/Tooltip";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import SpinnerIcon from "img/ic_spinner.svg?react";

import { ClaimFundingSelection, useClaimableFunding, useClaimableFundingSelection } from "./useClaimableFunding";

import "./ClaimModal.scss";

type Props = {
  isVisible: boolean;
  onClose: () => void;
  setPendingTxns: (txns: any) => void;
};

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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const selection = useClaimableFundingSelection(isVisible);

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
    } else {
      return {
        text: t`Claim`,
        onClick: onSubmit,
      };
    }
  }, [isSubmitting, onSubmit, hasOutdatedUi]);

  return (
    <ClaimModalComponent isVisible={isVisible} onClose={onClose} buttonState={buttonState} selection={selection} />
  );
}

function ClaimModalMultichain(p: Props) {
  const { isVisible, onClose } = p;
  const { account, signer } = useWallet();
  const { chainId, srcChainId } = useChainId();
  const { provider } = useJsonRpcProvider(chainId);
  const tokensData = useTokensData();
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

  const expressTxnParamsAsyncResult = useArbitraryRelayParamsAndPayload({
    expressTransactionBuilder,
    isGmxAccount: srcChainId !== undefined,
  });

  const errors = useArbitraryError(expressTxnParamsAsyncResult.error);
  const outOfTokenErrorToken = useMemo(() => {
    if (errors?.isOutOfTokenError?.tokenAddress) {
      return getByKey(tokensData, errors.isOutOfTokenError.tokenAddress);
    }
    return undefined;
  }, [errors, tokensData]);

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

        helperToast.info(
          <div className="flex items-center justify-between">
            <div className="text-white/50">
              <Trans>Claiming...</Trans>
            </div>
            <SpinnerIcon className="spin size-15 text-white" />
          </div>,
          { autoClose: false, toastId: "funding-claimed" }
        );
        request.wait().then((res) => {
          if (res.status === "success") {
            toast.update("funding-claimed", {
              render: t`Funding fees claimed`,
              type: "success",
              autoClose: TOAST_AUTO_CLOSE_TIME,
            });
          } else if (res.status === "failed") {
            toast.update("funding-claimed", {
              render: t`Claiming funding fees failed`,
              type: "error",
              autoClose: TOAST_AUTO_CLOSE_TIME,
            });
          }
        });

        onClose();
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }, [account, chainId, expressTxnParamsAsyncResult.promise, onClose, provider, selection.selectedEntries, signer]);

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

    if (errors?.isOutOfTokenError) {
      return {
        text: t`Insufficient ${outOfTokenErrorToken?.symbol ?? ""} balance`,
        disabled: true,
      };
    }

    if (!expressTxnParamsAsyncResult.data) {
      return {
        text: (
          <>
            <Trans>Loading...</Trans>
            <SpinnerIcon className="ml-4 animate-spin" />
          </>
        ),
        disabled: true,
      };
    }

    return {
      text: t`Claim`,
      onClick: onSubmit,
    };
  }, [hasOutdatedUi, isSubmitting, errors, outOfTokenErrorToken, expressTxnParamsAsyncResult.data, onSubmit]);

  return (
    <ClaimModalComponent
      isVisible={isVisible}
      onClose={onClose}
      buttonState={buttonState}
      selection={selection}
      errors={errors}
      outOfTokenErrorToken={outOfTokenErrorToken}
    />
  );
}

function ClaimModalComponent(p: {
  isVisible: boolean;
  onClose: () => void;
  buttonState: { text: React.ReactNode; onClick?: () => void; disabled?: boolean };
  selection: ClaimFundingSelection;
  errors?: ArbitraryExpressError;
  outOfTokenErrorToken?: TokenData;
}) {
  const { isVisible, onClose, buttonState, selection, errors, outOfTokenErrorToken } = p;

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
      {errors?.isOutOfTokenError && outOfTokenErrorToken && (
        <div className="mb-15">
          <OutOfTokenErrorAlert errors={errors} token={outOfTokenErrorToken} onClose={onClose} />
        </div>
      )}
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
