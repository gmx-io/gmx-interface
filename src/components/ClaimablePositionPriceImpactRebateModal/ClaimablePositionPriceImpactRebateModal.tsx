import { t, Trans } from "@lingui/macro";
import { memo, useCallback, useMemo, useState } from "react";
import { toast } from "react-toastify";

import { TOAST_AUTO_CLOSE_TIME } from "config/ui";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useMarketInfo } from "context/SyntheticsStateContext/hooks/marketHooks";
import {
  selectClaimablePositionPriceImpactFees,
  selectClaimsGroupedPositionPriceImpactClaimableFees,
  selectClaimsPriceImpactClaimableTotal,
} from "context/SyntheticsStateContext/selectors/claimsSelectors";
import { selectGmxAccountGasPaymentToken } from "context/SyntheticsStateContext/selectors/expressSelectors";
import { selectGmxAccountGasPaymentTokenAddress } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  ArbitraryExpressError,
  useArbitraryError,
  useArbitraryRelayParamsAndPayload,
} from "domain/multichain/arbitraryRelayParams";
import {
  buildAndSignClaimPositionPriceImpactFeesTxn,
  createClaimCollateralTxn,
  estimateClaimCollateralGas,
} from "domain/synthetics/claimHistory/claimPriceImpactRebate";
import { ExpressTransactionBuilder, RawRelayParamsPayload } from "domain/synthetics/express";
import { useGasPrice } from "domain/synthetics/fees";
import {
  GMX_ACCOUNT_NETWORK_FEE_SOURCE,
  WALLET_NETWORK_FEE_SOURCE,
  type NetworkFeeDetails,
  type NetworkFeeSource,
} from "domain/synthetics/fees/networkFeeSource";
import { RebateInfoItem } from "domain/synthetics/fees/useRebatesInfo";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { convertToUsd, getMidPrice, getTokenData } from "domain/synthetics/tokens";
import { getInsufficientFeeButtonMessage } from "domain/synthetics/trade/utils/validation";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { metrics } from "lib/metrics";
import { expandDecimals, formatDeltaUsd, formatTokenAmount } from "lib/numbers";
import { useJsonRpcProvider } from "lib/rpc";
import { sendExpressTransaction } from "lib/transactions";
import { getPageOutdatedError, useHasOutdatedUi } from "lib/useHasOutdatedUi";
import { usePrevious } from "lib/usePrevious";
import { useThrottledAsync } from "lib/useThrottledAsync";
import { switchNetwork } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { getToken } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";
import { nowInSeconds } from "sdk/utils/time";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import { InsufficientGmxAccountGasTokenBalanceMessage } from "components/Errors/gasErrors";
import { calculateNetworkFeeDetails } from "components/GmxAccountModal/calculateNetworkFeeDetails";
import Modal from "components/Modal/Modal";
import { SimpleNetworkFeeRow } from "components/NetworkFeeRow/SimpleNetworkFeeRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

type ClaimNetworkFee = {
  details: NetworkFeeDetails | undefined;
  isLoading: boolean;
  source: NetworkFeeSource;
  isExpress: boolean;
};

import SpinnerIcon from "img/ic_spinner.svg?react";

export function ClaimablePositionPriceImpactRebateModal({
  isVisible,
  onClose,
}: {
  isVisible: boolean;
  onClose: () => void;
}) {
  const { srcChainId } = useChainId();

  return srcChainId !== undefined ? (
    <ClaimablePositionPriceImpactRebateModalMultichain isVisible={isVisible} onClose={onClose} />
  ) : (
    <ClaimablePositionPriceImpactRebateModalSettlementChain isVisible={isVisible} onClose={onClose} />
  );
}

function ClaimablePositionPriceImpactRebateModalSettlementChain({
  isVisible,
  onClose,
}: {
  isVisible: boolean;
  onClose: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { chainId, srcChainId } = useChainId();
  const { signer, account, active } = useWallet();
  const claimablePositionPriceImpactFees = useSelector(selectClaimablePositionPriceImpactFees);
  const hasOutdatedUi = useHasOutdatedUi();
  const tokensData = useTokensData();
  const gasPrice = useGasPrice(chainId);

  const gasEstimationParams = useMemo(() => {
    if (!isVisible || !account || srcChainId !== undefined || claimablePositionPriceImpactFees.length === 0) {
      return undefined;
    }

    return { chainId, account, claimablePositionPriceImpactFees };
  }, [account, chainId, claimablePositionPriceImpactFees, isVisible, srcChainId]);

  const gasEstimationKey = gasEstimationParams
    ? gasEstimationParams.claimablePositionPriceImpactFees.map((item) => item.id).join("|")
    : undefined;
  const prevGasEstimationKey = usePrevious(gasEstimationKey);

  const gasLimitAsyncResult = useThrottledAsync(
    async ({ params }) =>
      estimateClaimCollateralGas(params.chainId, {
        account: params.account,
        claimablePositionPriceImpactFees: params.claimablePositionPriceImpactFees,
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

  const handleSubmit = useCallback(async () => {
    if (!signer) throw new Error("No signer");
    if (!account) throw new Error("No account");

    if (srcChainId !== undefined) {
      switchNetwork(chainId, active);
      return;
    }

    setIsSubmitting(true);

    try {
      await createClaimCollateralTxn(chainId, signer, {
        account,
        claimablePositionPriceImpactFees,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }, [account, active, chainId, claimablePositionPriceImpactFees, onClose, signer, srcChainId]);

  const buttonState: {
    text: string;
    disabled?: boolean;
    onSubmit?: () => void;
  } = useMemo(() => {
    if (hasOutdatedUi) {
      return { text: getPageOutdatedError(), disabled: true };
    }
    if (isSubmitting) {
      return { text: t`Claiming...`, disabled: true };
    }
    if (networkFee.isLoading) {
      return { text: t`Loading fees...`, disabled: true };
    }
    return { text: t`Claim`, disabled: false, onSubmit: handleSubmit };
  }, [handleSubmit, hasOutdatedUi, isSubmitting, networkFee.isLoading]);

  return (
    <ClaimablePositionPriceImpactRebateModalComponent
      isVisible={isVisible}
      onClose={onClose}
      buttonState={buttonState}
      networkFee={networkFee}
    />
  );
}

function ClaimablePositionPriceImpactRebateModalMultichain({
  isVisible,
  onClose,
}: {
  isVisible: boolean;
  onClose: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { chainId, srcChainId } = useChainId();
  const { signer, account } = useWallet();
  const claimablePositionPriceImpactFees = useSelector(selectClaimablePositionPriceImpactFees);
  const { provider } = useJsonRpcProvider(chainId);
  const hasOutdatedUi = useHasOutdatedUi();

  const expressTransactionBuilder = useMemo((): ExpressTransactionBuilder | undefined => {
    if (
      srcChainId === undefined ||
      account === undefined ||
      signer === undefined ||
      provider === undefined ||
      isSubmitting
    ) {
      return undefined;
    }

    return async (params) => {
      const txnData = await buildAndSignClaimPositionPriceImpactFeesTxn({
        signer,
        relayParams: {
          ...(params.relayParams as RawRelayParamsPayload),
          deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
        },
        account,
        claimablePositionPriceImpactFees,
        receiver: account,
        chainId,
        emptySignature: true,
        relayerFeeTokenAddress: params.gasPaymentParams.relayerFeeTokenAddress,
        relayerFeeAmount: params.gasPaymentParams.relayerFeeAmount,
      });

      return {
        txnData,
      };
    };
  }, [account, chainId, claimablePositionPriceImpactFees, isSubmitting, provider, signer, srcChainId]);

  const expressTxnParamsAsyncResult = useArbitraryRelayParamsAndPayload({
    expressTransactionBuilder,
    isGmxAccount: srcChainId !== undefined,
  });

  const errors = useArbitraryError(expressTxnParamsAsyncResult.error, { isGmxAccount: srcChainId !== undefined });
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
        claimablePositionPriceImpactFees.length > 0 &&
        expressTxnParamsAsyncResult.error === undefined,
      source: GMX_ACCOUNT_NETWORK_FEE_SOURCE,
      isExpress: true,
    };
  }, [
    claimablePositionPriceImpactFees.length,
    errors?.isOutOfTokenError,
    expressTxnParamsAsyncResult.data,
    expressTxnParamsAsyncResult.error,
    gmxAccountGasPaymentToken,
  ]);

  const handleSubmit = useCallback(async () => {
    const onMissingParams = () => {
      helperToast.error(t`Missing claim parameters. Retry in a few seconds`);
      metrics.pushError(new Error("No necessary params to claim"), "expressClaimPositionPriceImpactFees");
    };

    if (!expressTxnParamsAsyncResult.promise) {
      onMissingParams();
      return;
    }

    setIsSubmitting(true);
    expressTxnParamsAsyncResult.promise
      .then(async (params) => {
        if (!params || !signer || !account || !provider) {
          onMissingParams();
          return;
        }

        const txnData = await buildAndSignClaimPositionPriceImpactFeesTxn({
          signer,
          relayParams: {
            ...(params.relayParamsPayload as RawRelayParamsPayload),
            deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
          },
          account,
          claimablePositionPriceImpactFees,
          receiver: account,
          chainId,
          relayerFeeTokenAddress: params.gasPaymentParams.relayerFeeTokenAddress,
          relayerFeeAmount: params.gasPaymentParams.relayerFeeAmount,
        });

        const request = await sendExpressTransaction({
          chainId,
          txnData,
        });

        helperToast.info(
          <div className="flex items-center justify-between">
            <div className="text-white/50">
              <Trans>Claiming price impact rebates...</Trans>
            </div>
            <SpinnerIcon className="spin size-15 text-white" />
          </div>,
          {
            autoClose: false,
            toastId: "position-price-impact-fees",
          }
        );
        request.wait().then((res) => {
          if (res.status === "success") {
            toast.update("position-price-impact-fees", {
              render: t`Price impact rebates claimed`,
              type: "success",
              autoClose: TOAST_AUTO_CLOSE_TIME,
            });
          } else if (res.status === "failed") {
            toast.update("position-price-impact-fees", {
              render: t`Failed to claim price impact rebates`,
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
  }, [
    account,
    chainId,
    claimablePositionPriceImpactFees,
    expressTxnParamsAsyncResult.promise,
    onClose,
    provider,
    signer,
  ]);

  const buttonState: {
    text: string;
    disabled?: boolean;
    onSubmit?: () => void;
  } = useMemo(() => {
    if (hasOutdatedUi) {
      return { text: getPageOutdatedError(), disabled: true };
    }
    if (isSubmitting) {
      return { text: t`Claiming...`, disabled: true };
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
      return { text: t`Network fee unavailable`, disabled: true };
    }
    if (networkFee.isLoading) {
      return { text: t`Loading fees...`, disabled: true };
    }
    return { text: t`Claim`, disabled: false, onSubmit: handleSubmit };
  }, [
    chainId,
    errors?.isOutOfTokenError?.isGasPaymentToken,
    expressTxnParamsAsyncResult.error,
    gmxAccountGasPaymentTokenAddress,
    handleSubmit,
    hasOutdatedUi,
    isSubmitting,
    networkFee.isLoading,
  ]);

  return (
    <ClaimablePositionPriceImpactRebateModalComponent
      isVisible={isVisible}
      onClose={onClose}
      buttonState={buttonState}
      networkFee={networkFee}
      errors={errors}
    />
  );
}

function ClaimablePositionPriceImpactRebateModalComponent({
  isVisible,
  onClose,
  buttonState,
  networkFee,
  errors,
}: {
  isVisible: boolean;
  onClose: () => void;
  buttonState: {
    text: string;
    disabled?: boolean;
    onSubmit?: () => void;
  };
  networkFee: ClaimNetworkFee;
  errors?: ArbitraryExpressError;
}) {
  const { chainId } = useChainId();
  const total = useSelector(selectClaimsPriceImpactClaimableTotal);
  const totalUsd = useMemo(() => formatDeltaUsd(total), [total]);
  const groups = useSelector(selectClaimsGroupedPositionPriceImpactClaimableFees);

  return (
    <Modal
      label={t`Confirm claim`}
      className="Confirmation-box ClaimableModal"
      setIsVisible={onClose}
      isVisible={isVisible}
    >
      <div className="ConfirmationBox-main">
        <div className="text-center">
          <Trans>Claim {totalUsd}</Trans>
        </div>
      </div>
      <div className="mb-20 mt-15 h-1 bg-slate-700" />
      <div className="ClaimModal-content ClaimSettleModal-modal-content">
        <div className="App-card-content">
          <div className="ClaimSettleModal-header">
            <div>
              <Trans>MARKET</Trans>
            </div>
            <div className="ClaimSettleModal-header-right">
              <Trans>REBATE</Trans>
            </div>
          </div>
          {groups.map((rebateItems) => (
            <Row key={rebateItems[0].marketAddress} rebateItems={rebateItems} />
          ))}
        </div>
      </div>
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
        details={networkFee.details}
        isLoading={networkFee.isLoading}
        source={networkFee.source}
        isExpress={networkFee.isExpress}
      />
      <Button
        className="w-full"
        variant="primary-action"
        disabled={buttonState.disabled}
        onClick={buttonState.onSubmit}
      >
        {buttonState.text}
      </Button>
    </Modal>
  );
}

const Row = memo(({ rebateItems }: { rebateItems: RebateInfoItem[] }) => {
  const market = useMarketInfo(rebateItems[0].marketAddress);
  const label = useMemo(() => {
    if (!market) return "";
    const indexName = getMarketIndexName(market);
    const poolName = getMarketPoolName(market);
    return (
      <div className="flex items-center">
        <span className="text-typography-primary">{indexName}</span>
        <span className="subtext">[{poolName}]</span>
      </div>
    );
  }, [market]);

  const tokensData = useTokensData();

  const reducedByTokenItems = useMemo(() => {
    const groupedTokens: Record<string, number> = {};
    const reduced = rebateItems.reduce((acc, rebateItem) => {
      const key = rebateItem.marketAddress + rebateItem.tokenAddress;
      if (typeof groupedTokens[key] === "number") {
        const index = groupedTokens[key];
        acc[index].value = acc[index].value + rebateItem.value;
        acc[index].valueByFactor = acc[index].valueByFactor + rebateItem.valueByFactor;
      } else {
        groupedTokens[key] = acc.length;
        acc.push({ ...rebateItem });
      }

      return acc;
    }, [] as RebateInfoItem[]);
    if (reduced.length !== 2) return reduced;

    reduced.sort((a, b) => {
      let ax = 0;
      let bx = 0;

      if (a.tokenAddress === market?.longTokenAddress) ax = 1;
      else if (a.tokenAddress === market?.shortTokenAddress) ax = -1;

      if (b.tokenAddress === market?.longTokenAddress) bx = 1;
      else if (b.tokenAddress === market?.shortTokenAddress) bx = -1;

      return bx - ax;
    });

    return reduced;
  }, [market?.longTokenAddress, market?.shortTokenAddress, rebateItems]);

  const usd = useMemo(() => {
    let total = 0n;

    rebateItems.forEach((rebateItem) => {
      const tokenData = getTokenData(tokensData, rebateItem.tokenAddress);
      const price = tokenData?.prices.minPrice;
      const decimals = tokenData?.decimals;
      const usd =
        price !== undefined && decimals
          ? bigMath.mulDiv(rebateItem.valueByFactor, price, expandDecimals(1, decimals))
          : null;
      if (usd === null) return;
      total = total + usd;
    });

    return formatDeltaUsd(total);
  }, [rebateItems, tokensData]);

  const renderContent = useCallback(
    () =>
      reducedByTokenItems.map((rebateItem) => {
        const tokenData = getTokenData(tokensData, rebateItem.tokenAddress);
        if (!tokenData) return null;
        return (
          <div key={rebateItem.id}>
            {formatTokenAmount(rebateItem.valueByFactor, tokenData?.decimals, tokenData?.symbol, {
              isStable: tokenData.isStable,
            })}
          </div>
        );
      }),
    [reducedByTokenItems, tokensData]
  );

  return (
    <div className="ClaimSettleModal-info-row">
      <div className="Exchange-info-label">{label}</div>
      <div className="ClaimSettleModal-info-label-usd">
        <TooltipWithPortal
          position="top-end"
          tooltipClassName="ClaimModal-row-tooltip"
          handle={usd}
          renderContent={renderContent}
        />
      </div>
    </div>
  );
});
