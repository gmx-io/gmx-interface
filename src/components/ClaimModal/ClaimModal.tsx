import { Trans, t } from "@lingui/macro";
import { useCallback, useMemo, useState } from "react";
import { toast } from "react-toastify";

import { TOAST_AUTO_CLOSE_TIME } from "config/ui";
import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useArbitraryRelayParamsAndPayload } from "domain/multichain/arbitraryRelayParams";
import { ExpressTransactionBuilder, RawRelayParamsPayload } from "domain/synthetics/express";
import {
  MarketInfo,
  getMarketIndexName,
  getMarketPoolName,
  getTotalClaimableFundingUsd,
} from "domain/synthetics/markets";
import { buildAndSignClaimFundingFeesTxn, claimFundingFeesTxn } from "domain/synthetics/markets/claimFundingFeesTxn";
import { convertToUsd } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { metrics } from "lib/metrics";
import { formatDeltaUsd, formatTokenAmount } from "lib/numbers";
import { useJsonRpcProvider } from "lib/rpc";
import { sendExpressTransaction } from "lib/transactions";
import { getPageOutdatedError, useHasOutdatedUi } from "lib/useHasOutdatedUi";
import useWallet from "lib/wallets/useWallet";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { nowInSeconds } from "sdk/utils/time";

import Button from "components/Button/Button";
import Modal from "components/Modal/Modal";
import Tooltip from "components/Tooltip/Tooltip";

import SpinnerIcon from "img/ic_spinner.svg?react";

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
  const marketsInfoData = useMarketsInfoData();
  const hasOutdatedUi = useHasOutdatedUi();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = useCallback(() => {
    if (!account || !signer) return;

    const fundingMarketAddresses: string[] = [];
    const fundingTokenAddresses: string[] = [];

    const pairs = new Set<string>();

    function pushPair(marketAddress: string, tokenAddress: string) {
      const key = `${marketAddress}-${tokenAddress}`;
      if (pairs.has(key)) return;
      pairs.add(key);
      fundingMarketAddresses.push(marketAddress);
      fundingTokenAddresses.push(tokenAddress);
    }

    const markets = isVisible ? Object.values(marketsInfoData || {}) : [];
    for (const market of markets) {
      if (market.claimableFundingAmountLong !== undefined && market.claimableFundingAmountLong !== 0n) {
        pushPair(market.marketTokenAddress, market.longTokenAddress);
      }

      if (market.claimableFundingAmountShort !== undefined && market.claimableFundingAmountShort !== 0n) {
        pushPair(market.marketTokenAddress, market.shortTokenAddress);
      }
    }

    setIsSubmitting(true);

    claimFundingFeesTxn(chainId, signer, {
      account,
      fundingFees: {
        marketAddresses: fundingMarketAddresses,
        tokenAddresses: fundingTokenAddresses,
      },
      setPendingTxns,
    })
      .then(onClose)
      .finally(() => setIsSubmitting(false));
  }, [account, chainId, isVisible, marketsInfoData, onClose, setPendingTxns, signer]);

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

  return <ClaimModalComponent isVisible={isVisible} onClose={onClose} buttonState={buttonState} />;
}

function ClaimModalMultichain(p: Props) {
  const { isVisible, onClose } = p;
  const { account, signer } = useWallet();
  const { chainId, srcChainId } = useChainId();
  const marketsInfoData = useMarketsInfoData();
  const { provider } = useJsonRpcProvider(chainId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasOutdatedUi = useHasOutdatedUi();

  const { fundingMarketAddresses, fundingTokenAddresses } = useMemo(() => {
    const fundingMarketAddresses: string[] = [];
    const fundingTokenAddresses: string[] = [];

    const pairs = new Set<string>();

    function pushPair(marketAddress: string, tokenAddress: string) {
      const key = `${marketAddress}-${tokenAddress}`;
      if (pairs.has(key)) return;
      pairs.add(key);
      fundingMarketAddresses.push(marketAddress);
      fundingTokenAddresses.push(tokenAddress);
    }

    const markets = isVisible ? Object.values(marketsInfoData || {}) : [];
    for (const market of markets) {
      if (market.claimableFundingAmountLong !== undefined && market.claimableFundingAmountLong !== 0n) {
        pushPair(market.marketTokenAddress, market.longTokenAddress);
      }

      if (market.claimableFundingAmountShort !== undefined && market.claimableFundingAmountShort !== 0n) {
        pushPair(market.marketTokenAddress, market.shortTokenAddress);
      }
    }

    return {
      fundingMarketAddresses,
      fundingTokenAddresses,
    };
  }, [isVisible, marketsInfoData]);

  const expressTransactionBuilder: ExpressTransactionBuilder | undefined = useMemo(() => {
    if (!account || !signer || !provider || fundingMarketAddresses.length === 0 || isSubmitting) {
      return undefined;
    }

    return async (params) => {
      const txnData = await buildAndSignClaimFundingFeesTxn({
        chainId,
        markets: fundingMarketAddresses,
        tokens: fundingTokenAddresses,
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
  }, [account, chainId, fundingMarketAddresses, fundingTokenAddresses, isSubmitting, provider, signer]);

  const expressTxnParamsAsyncResult = useArbitraryRelayParamsAndPayload({
    expressTransactionBuilder,
    isGmxAccount: srcChainId !== undefined,
  });

  const onSubmit = useCallback(() => {
    const onMissingParams = () => {
      helperToast.error(t`No necessary params to claim. Retry in a few seconds.`);
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
          markets: fundingMarketAddresses,
          tokens: fundingTokenAddresses,
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
          isSponsoredCall: expressTxnParams.isSponsoredCall,
          txnData,
        });

        helperToast.success(
          <div className="flex items-center justify-between">
            <div className="text-white/50">
              <Trans>Claiming funding fees...</Trans>
            </div>
            <SpinnerIcon className="spin size-15 text-white" />
          </div>,
          { autoClose: false, toastId: "funding-claimed" }
        );
        request.wait().then((res) => {
          if (res.status === "success") {
            toast.update("funding-claimed", {
              render: t`Success claiming funding fees`,
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
  }, [
    account,
    chainId,
    expressTxnParamsAsyncResult.promise,
    fundingMarketAddresses,
    fundingTokenAddresses,
    onClose,
    provider,
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
  }, [hasOutdatedUi, expressTxnParamsAsyncResult.data, isSubmitting, onSubmit]);

  return <ClaimModalComponent isVisible={isVisible} onClose={onClose} buttonState={buttonState} />;
}

function ClaimModalComponent(p: {
  isVisible: boolean;
  onClose: () => void;
  buttonState: { text: React.ReactNode; onClick?: () => void; disabled?: boolean };
}) {
  const { isVisible, onClose, buttonState } = p;

  const marketsInfoData = useMarketsInfoData();

  const markets = isVisible ? Object.values(marketsInfoData || {}) : [];

  const totalClaimableFundingUsd = getTotalClaimableFundingUsd(markets);

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

    return (
      <div key={market.marketTokenAddress} className="ClaimSettleModal-info-row">
        <div className="flex">
          <div className="Exchange-info-label ClaimSettleModal-checkbox-label">
            <div className="ClaimSettleModal-row-text flex items-start">
              <span>{indexName}</span>
              {poolName ? <span className="subtext">[{poolName}]</span> : null}
            </div>
          </div>
        </div>
        <div className="ClaimSettleModal-info-label-usd">
          <Tooltip
            className="ClaimSettleModal-tooltip"
            position="top-end"
            handle={formatDeltaUsd(totalFundingUsd)}
            renderContent={() => (
              <>
                {claimableAmountsItems.map((item) => (
                  <div key={item}>{item}</div>
                ))}
              </>
            )}
          />
        </div>
      </div>
    );
  }

  return (
    <Modal
      className="Confirmation-box ClaimableModal"
      isVisible={p.isVisible}
      setIsVisible={onClose}
      label={t`Confirm Claim`}
    >
      <div className="ConfirmationBox-main">
        <div className="text-center">
          <Trans>
            Claim <span>{formatDeltaUsd(totalClaimableFundingUsd)}</span>
          </Trans>
        </div>
      </div>
      <div className="mb-20 mt-15 h-1 bg-slate-700" />
      <div className="ClaimSettleModal-info-row">
        <div className="flex">
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
                <span className="text-typography-primary">Claimable Funding Fee.</span>
              </Trans>
            )}
          />
        </div>
      </div>
      <div className="ClaimModal-content">{markets.map(renderMarketSection)}</div>
      <Button className="w-full" variant="primary-action" onClick={buttonState.onClick} disabled={buttonState.disabled}>
        {buttonState.text}
      </Button>
    </Modal>
  );
}
