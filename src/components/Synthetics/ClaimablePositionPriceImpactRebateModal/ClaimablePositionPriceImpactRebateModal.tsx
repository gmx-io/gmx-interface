import { t, Trans } from "@lingui/macro";
import { memo, useCallback, useMemo, useState } from "react";
import { ImSpinner2 } from "react-icons/im";
import { toast } from "react-toastify";

import { getContract } from "config/contracts";
import { TOAST_AUTO_CLOSE_TIME } from "config/ui";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useMarketInfo } from "context/SyntheticsStateContext/hooks/marketHooks";
import {
  selectClaimablePositionPriceImpactFees,
  selectClaimsGroupedPositionPriceImpactClaimableFees,
  selectClaimsPriceImpactClaimableTotal,
} from "context/SyntheticsStateContext/selectors/claimsSelectors";
import { selectExpressNoncesData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useArbitraryRelayParamsAndPayload } from "domain/multichain/arbitraryRelayParams";
import {
  buildAndSignClaimPositionPriceImpactFeesTxn,
  createClaimCollateralTxn,
} from "domain/synthetics/claimHistory/claimPriceImpactRebate";
import {
  ExpressTransactionBuilder,
  getRelayRouterNonceForMultichain,
  RawMultichainRelayParamsPayload,
} from "domain/synthetics/express";
import { RebateInfoItem } from "domain/synthetics/fees/useRebatesInfo";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { getTokenData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { metrics } from "lib/metrics";
import { expandDecimals, formatDeltaUsd, formatTokenAmount } from "lib/numbers";
import { useJsonRpcProvider } from "lib/rpc";
import { sendExpressTransaction } from "lib/transactions";
import { switchNetwork } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { bigMath } from "sdk/utils/bigmath";
import { nowInSeconds } from "sdk/utils/time";

import Button from "components/Button/Button";
import Modal from "components/Modal/Modal";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

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
    if (isSubmitting) {
      return { text: t`Claiming...`, disabled: true };
    }
    return { text: t`Claim`, disabled: false, onSubmit: handleSubmit };
  }, [handleSubmit, isSubmitting]);

  return (
    <ClaimablePositionPriceImpactRebateModalComponent
      isVisible={isVisible}
      onClose={onClose}
      buttonState={buttonState}
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
      let userNonce: bigint | undefined = params.noncesData?.multichainClaimsRouter?.nonce;
      if (userNonce === undefined) {
        userNonce = await getRelayRouterNonceForMultichain(
          provider,
          account,
          getContract(chainId, "MultichainClaimsRouter")
        );
      }
      const txnData = await buildAndSignClaimPositionPriceImpactFeesTxn({
        signer,
        relayParams: {
          ...(params.relayParams as RawMultichainRelayParamsPayload),
          deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
          userNonce,
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
  });
  const noncesData = useSelector(selectExpressNoncesData);

  const handleSubmit = useCallback(async () => {
    const onMissingParams = () => {
      helperToast.error(t`No necessary params to claim. Retry in a few seconds.`);
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

        let userNonce: bigint | undefined = noncesData?.multichainClaimsRouter?.nonce;
        if (userNonce === undefined) {
          userNonce = await getRelayRouterNonceForMultichain(
            provider,
            account,
            getContract(chainId, "MultichainClaimsRouter")
          );
        }

        const txnData = await buildAndSignClaimPositionPriceImpactFeesTxn({
          signer,
          relayParams: {
            ...(params.relayParamsPayload as RawMultichainRelayParamsPayload),
            deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
            userNonce,
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
          isSponsoredCall: params.isSponsoredCall,
          txnData,
        });

        helperToast.success(
          <div className="flex items-center justify-between">
            <div className="text-white/50">
              <Trans>Claiming position price impact fees</Trans>
            </div>
            <ImSpinner2 width={60} height={60} className="spin size-15 text-white" />
          </div>,
          {
            autoClose: false,
            toastId: "position-price-impact-fees",
          }
        );
        request.wait().then((res) => {
          if (res.status === "success") {
            toast.update("position-price-impact-fees", {
              render: t`Success claiming position price impact fees`,
              type: "success",
              autoClose: TOAST_AUTO_CLOSE_TIME,
            });
          } else if (res.status === "failed") {
            toast.update("position-price-impact-fees", {
              render: t`Claiming position price impact fees failed`,
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
    noncesData?.multichainClaimsRouter?.nonce,
    onClose,
    provider,
    signer,
  ]);

  const buttonState: {
    text: string;
    disabled?: boolean;
    onSubmit?: () => void;
  } = useMemo(() => {
    if (isSubmitting) {
      return { text: t`Claiming...`, disabled: true };
    }
    return { text: t`Claim`, disabled: false, onSubmit: handleSubmit };
  }, [handleSubmit, isSubmitting]);

  return (
    <ClaimablePositionPriceImpactRebateModalComponent
      isVisible={isVisible}
      onClose={onClose}
      buttonState={buttonState}
    />
  );
}

function ClaimablePositionPriceImpactRebateModalComponent({
  isVisible,
  onClose,
  buttonState,
}: {
  isVisible: boolean;
  onClose: () => void;
  buttonState: {
    text: string;
    disabled?: boolean;
    onSubmit?: () => void;
  };
}) {
  const total = useSelector(selectClaimsPriceImpactClaimableTotal);
  const totalUsd = useMemo(() => formatDeltaUsd(total), [total]);
  const groups = useSelector(selectClaimsGroupedPositionPriceImpactClaimableFees);

  return (
    <Modal
      label={t`Confirm Claim`}
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
        <span className="text-white">{indexName}</span>
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
