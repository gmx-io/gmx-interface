import { t } from "@lingui/macro";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { Address, encodeAbiParameters } from "viem";
import { useAccount } from "wagmi";

import { AnyChainId, getChainName, SettlementChainId, SourceChainId } from "config/chains";
import { getLayerZeroEndpointId, getStargatePoolAddress, isSourceChain } from "config/multichain";
import { useGmxAccountSettlementChainId } from "context/GmxAccountContext/hooks";
import { selectDepositMarketTokensData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useArbitraryError, useArbitraryRelayParamsAndPayload } from "domain/multichain/arbitraryRelayParams";
import { BridgeOutParams } from "domain/multichain/types";
import { buildAndSignBridgeOutTxn } from "domain/synthetics/express/expressOrderUtils";
import { ExpressTransactionBuilder } from "domain/synthetics/express/types";
import { getGlvOrMarketAddress, GlvOrMarketInfo } from "domain/synthetics/markets";
import { createBridgeOutTxn } from "domain/synthetics/markets/createBridgeOutTxn";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { convertToUsd, getMidPrice, getTokenData, TokenBalanceType } from "domain/tokens";
import { useMaxAvailableAmount } from "domain/tokens/useMaxAvailableAmount";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { getMarketIndexName } from "sdk/utils/markets";
import { formatBalanceAmount, formatUsd, parseValue } from "sdk/utils/numbers";

import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { getTxnErrorToast } from "components/Errors/errorToasts";
import { useMultichainMarketTokenBalancesRequest } from "components/GmxAccountModal/hooks";
import { wrapChainAction } from "components/GmxAccountModal/wrapChainAction";
import { SlideModal } from "components/Modal/SlideModal";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import { MultichainMarketTokenSelector } from "components/TokenSelector/MultichainMarketTokenSelector";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import SpinnerIcon from "img/ic_spinner.svg?react";

export function BridgeOutModal({
  isVisible,
  setIsVisible,
  glvOrMarketInfo,
}: {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
  glvOrMarketInfo: GlvOrMarketInfo | undefined;
}) {
  const { chainId, srcChainId } = useChainId();
  const [, setSettlementChainId] = useGmxAccountSettlementChainId();
  const [bridgeOutChain, setBridgeOutChain] = useState<SourceChainId | undefined>(srcChainId);
  const [bridgeOutInputValue, setBridgeOutInputValue] = useState("");
  const [isCreatingTxn, setIsCreatingTxn] = useState(false);

  const depositMarketTokensData = useSelector(selectDepositMarketTokensData);
  const glvOrMarketAddress = glvOrMarketInfo ? getGlvOrMarketAddress(glvOrMarketInfo) : undefined;
  const marketToken = getTokenData(depositMarketTokensData, glvOrMarketAddress);
  const isGlv = isGlvInfo(glvOrMarketInfo);

  const marketTokenDecimals = isGlv ? glvOrMarketInfo?.glvToken.decimals : marketToken?.decimals;
  let marketTokenPrice: bigint | undefined = undefined;
  if (isGlv && glvOrMarketInfo?.glvToken.prices) {
    marketTokenPrice = getMidPrice(glvOrMarketInfo?.glvToken.prices);
  } else if (marketToken?.prices) {
    marketTokenPrice = getMidPrice(marketToken?.prices);
  }

  const bridgeOutAmount = useMemo(() => {
    return bridgeOutInputValue && marketTokenDecimals !== undefined
      ? parseValue(bridgeOutInputValue, marketTokenDecimals)
      : undefined;
  }, [bridgeOutInputValue, marketTokenDecimals]);

  const bridgeOutUsd = useMemo(() => {
    return bridgeOutAmount !== undefined && marketTokenDecimals !== undefined
      ? convertToUsd(bridgeOutAmount, marketTokenDecimals, marketTokenPrice)
      : undefined;
  }, [bridgeOutAmount, marketTokenDecimals, marketTokenPrice]);

  const glvOrGm = isGlv ? "GLV" : "GM";
  const { address: account } = useAccount();

  const { tokenBalancesData: marketTokenBalancesData } = useMultichainMarketTokenBalancesRequest(
    chainId,
    srcChainId,
    account,
    glvOrMarketAddress,
    isVisible
  );

  const settlementChainMarketTokenBalancesData: Partial<Record<0 | AnyChainId, bigint>> = useMemo(() => {
    return {
      [0]: marketTokenBalancesData[0],
    };
  }, [marketTokenBalancesData]);

  const gmxAccountMarketTokenBalance: bigint | undefined = settlementChainMarketTokenBalancesData[0];

  const bridgeOutChainMarketTokenBalance: bigint | undefined = bridgeOutChain
    ? marketTokenBalancesData[bridgeOutChain]
    : undefined;

  const nextBridgeOutMarketTokenBalance: bigint | undefined =
    bridgeOutChainMarketTokenBalance !== undefined && bridgeOutAmount !== undefined
      ? bridgeOutChainMarketTokenBalance + bridgeOutAmount
      : undefined;

  const { formattedBalance, formattedMaxAvailableAmount, showClickMax } = useMaxAvailableAmount({
    fromToken: marketToken,
    fromTokenAmount: bridgeOutAmount ?? 0n,
    fromTokenInputValue: bridgeOutInputValue,
    nativeToken: undefined,
    minResidualAmount: undefined,
    isLoading: false,
    srcChainId: undefined,
    tokenBalanceType: TokenBalanceType.GmxAccount,
  });

  const bridgeOutParams: BridgeOutParams | undefined = useMemo(() => {
    if (
      bridgeOutChain === undefined ||
      glvOrMarketAddress === undefined ||
      bridgeOutAmount === undefined ||
      bridgeOutAmount <= 0n
    ) {
      return;
    }

    const dstEid = getLayerZeroEndpointId(bridgeOutChain);
    const stargateAddress = getStargatePoolAddress(chainId, glvOrMarketAddress);

    if (dstEid === undefined || stargateAddress === undefined) {
      return;
    }

    return {
      token: glvOrMarketAddress as Address,
      amount: bridgeOutAmount,
      minAmountOut: 0n,
      data: encodeAbiParameters(
        [
          {
            type: "uint32",
            name: "dstEid",
          },
        ],
        [dstEid]
      ),
      provider: stargateAddress,
    };
  }, [bridgeOutChain, glvOrMarketAddress, bridgeOutAmount, chainId]);

  const expressTransactionBuilder: ExpressTransactionBuilder | undefined = useMemo(() => {
    if (account === undefined || bridgeOutParams === undefined || bridgeOutChain === undefined) {
      return;
    }

    const expressTransactionBuilder: ExpressTransactionBuilder = async ({ gasPaymentParams, relayParams }) => ({
      txnData: await buildAndSignBridgeOutTxn({
        chainId: chainId as SettlementChainId,
        signer: undefined,
        account,
        relayParamsPayload: relayParams,
        params: bridgeOutParams,
        emptySignature: true,
        relayerFeeTokenAddress: gasPaymentParams.relayerFeeTokenAddress,
        relayerFeeAmount: gasPaymentParams.relayerFeeAmount,
        srcChainId: bridgeOutChain,
      }),
    });

    return expressTransactionBuilder;
  }, [account, bridgeOutChain, bridgeOutParams, chainId]);

  const expressTxnParamsAsyncResult = useArbitraryRelayParamsAndPayload({
    expressTransactionBuilder,
    isGmxAccount: true,
    enabled: isVisible,
  });

  const errors = useArbitraryError(expressTxnParamsAsyncResult.error);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!account || !glvOrMarketAddress || bridgeOutAmount === undefined || !bridgeOutChain || !bridgeOutParams) {
      helperToast.error(t`Error submitting withdrawal`);
      return;
    }

    const expressTxnParams = await expressTxnParamsAsyncResult.promise;

    if (expressTxnParams === undefined) {
      helperToast.error("Missing required parameters");
      return;
    }

    try {
      setIsCreatingTxn(true);
      await wrapChainAction(bridgeOutChain, setSettlementChainId, async (signer) => {
        await createBridgeOutTxn({
          chainId: chainId as SettlementChainId,
          srcChainId: bridgeOutChain,
          account,
          expressTxnParams,
          relayerFeeAmount: expressTxnParams.gasPaymentParams.relayerFeeAmount,
          relayerFeeTokenAddress: expressTxnParams.gasPaymentParams.relayerFeeTokenAddress,
          params: bridgeOutParams,
          signer,
        });
      });
    } catch (error) {
      const toastParams = getTxnErrorToast(chainId, error, { defaultMessage: t`Error submitting withdrawal` });
      helperToast.error(toastParams.errorContent, {
        autoClose: toastParams.autoCloseToast,
      });
    } finally {
      setIsCreatingTxn(false);
    }
  };

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    if (bridgeOutChain === undefined && srcChainId !== undefined) {
      setBridgeOutChain(srcChainId);
    }
  }, [bridgeOutChain, isVisible, srcChainId]);

  const buttonState = useMemo((): { text: ReactNode; disabled?: boolean } => {
    if (isCreatingTxn) {
      return {
        text: (
          <>
            {t`Withdrawing`}
            <SpinnerIcon className="ml-4 animate-spin" />
          </>
        ),
        disabled: true,
      };
    }

    if (!bridgeOutInputValue) {
      return {
        text: t`Enter an amount`,
        disabled: true,
      };
    }

    if (
      gmxAccountMarketTokenBalance === undefined ||
      marketTokenDecimals === undefined ||
      bridgeOutAmount === undefined ||
      bridgeOutAmount > gmxAccountMarketTokenBalance
    ) {
      return {
        text: t`Insufficient balance`,
        disabled: true,
      };
    }

    if (errors?.isOutOfTokenError) {
      return {
        text: errors.isOutOfTokenError.isGasPaymentToken ? t`Insufficient gas balance` : t`Insufficient balance`,
        disabled: true,
      };
    }

    if (expressTxnParamsAsyncResult.data === undefined) {
      return {
        text: (
          <>
            {t`Loading`}
            <SpinnerIcon className="ml-4 animate-spin" />
          </>
        ),
        disabled: true,
      };
    }

    return {
      text: t`Withdraw`,
      disabled: false,
    };
  }, [
    isCreatingTxn,
    expressTxnParamsAsyncResult,
    errors,
    bridgeOutInputValue,
    gmxAccountMarketTokenBalance,
    marketTokenDecimals,
    bridgeOutAmount,
  ]);

  if (!glvOrMarketInfo) {
    return null;
  }

  return (
    <SlideModal
      isVisible={isVisible}
      setIsVisible={setIsVisible}
      label={t`Withdraw ${glvOrGm}: ${getMarketIndexName(glvOrMarketInfo)}`}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-12">
        <BuyInputSection
          topLeftLabel={t`Withdraw`}
          inputValue={bridgeOutInputValue}
          onInputValueChange={(e) => setBridgeOutInputValue(e.target.value)}
          bottomLeftValue={formatUsd(bridgeOutUsd)}
          bottomRightValue={formattedBalance}
          bottomRightLabel={t`Available`}
          onClickMax={
            showClickMax
              ? () => {
                  setBridgeOutInputValue(formattedMaxAvailableAmount);
                }
              : undefined
          }
        >
          <MultichainMarketTokenSelector
            chainId={chainId}
            srcChainId={bridgeOutChain}
            paySource={"settlementChain"}
            onSelectTokenAddress={(newBridgeOutChain) => {
              if (!isSourceChain(newBridgeOutChain)) {
                return;
              }
              setBridgeOutChain(newBridgeOutChain);
            }}
            marketInfo={glvOrMarketInfo}
            marketTokenPrice={marketTokenPrice}
            tokenBalancesData={settlementChainMarketTokenBalancesData}
          />
        </BuyInputSection>
        <Button className="w-full" type="submit" variant="primary-action" disabled={buttonState.disabled}>
          {buttonState.text}
        </Button>
        {bridgeOutChain !== undefined && (
          <SyntheticsInfoRow
            label={t`${getChainName(bridgeOutChain)} Balance`}
            value={
              <ValueTransition
                from={
                  bridgeOutChainMarketTokenBalance !== undefined && marketTokenDecimals !== undefined
                    ? formatBalanceAmount(bridgeOutChainMarketTokenBalance, marketTokenDecimals)
                    : undefined
                }
                to={
                  nextBridgeOutMarketTokenBalance !== undefined && marketTokenDecimals !== undefined
                    ? formatBalanceAmount(nextBridgeOutMarketTokenBalance, marketTokenDecimals)
                    : undefined
                }
              />
            }
          />
        )}
      </form>
    </SlideModal>
  );
}
