import { t, Trans } from "@lingui/macro";
import { ReactNode, useEffect, useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { encodeAbiParameters } from "viem";
import { useAccount } from "wagmi";

import {
  ContractsChainId,
  getChainName,
  GMX_ACCOUNT_PSEUDO_CHAIN_ID,
  SettlementChainId,
  SourceChainId,
} from "config/chains";
import { getChainIcon } from "config/icons";
import { getLayerZeroEndpointId, getStargatePoolAddress } from "config/multichain";
import { useGmxAccountSettlementChainId } from "context/GmxAccountContext/hooks";
import { selectMultichainMarketTokenBalances } from "context/PoolsDetailsContext/selectors/selectMultichainMarketTokenBalances";
import { selectDepositMarketTokensData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useArbitraryError, useArbitraryRelayParamsAndPayload } from "domain/multichain/arbitraryRelayParams";
import type { BridgeOutParams } from "domain/multichain/types";
import { buildAndSignBridgeOutTxn } from "domain/synthetics/express/expressOrderUtils";
import { ExpressTransactionBuilder } from "domain/synthetics/express/types";
import { getGlvOrMarketAddress, GlvOrMarketInfo } from "domain/synthetics/markets";
import { createBridgeOutTxn } from "domain/synthetics/markets/createBridgeOutTxn";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { convertToUsd, getMidPrice, getTokenData, TokenBalanceType } from "domain/tokens";
import { useMaxAvailableAmount } from "domain/tokens/useMaxAvailableAmount";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import { getMarketIndexName } from "sdk/utils/markets";
import { formatBalanceAmount, formatUsd, parseValue } from "sdk/utils/numbers";

import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { DropdownSelector } from "components/DropdownSelector/DropdownSelector";
import { getTxnErrorToast } from "components/Errors/errorToasts";
import { SelectedPoolLabel } from "components/GmSwap/GmSwapBox/SelectedPool";
import { useGmxAccountWithdrawNetworks } from "components/GmxAccountModal/hooks";
import { wrapChainAction } from "components/GmxAccountModal/wrapChainAction";
import { SlideModal } from "components/Modal/SlideModal";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import TokenIcon from "components/TokenIcon/TokenIcon";
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

  const multichainMarketTokensBalances = useSelector(selectMultichainMarketTokenBalances);
  const multichainMarketTokenBalances = glvOrMarketAddress
    ? multichainMarketTokensBalances[glvOrMarketAddress]
    : undefined;

  const networks = useGmxAccountWithdrawNetworks();

  const gmxAccountMarketTokenBalance: bigint | undefined =
    multichainMarketTokenBalances?.balances[GMX_ACCOUNT_PSEUDO_CHAIN_ID]?.balance;

  const nextGmxAccountMarketTokenBalance: bigint | undefined =
    gmxAccountMarketTokenBalance !== undefined && bridgeOutAmount !== undefined
      ? gmxAccountMarketTokenBalance - bridgeOutAmount
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

  const bridgeOutParams = useBridgeOutParams({
    bridgeOutChain,
    glvOrMarketAddress,
    bridgeOutAmount,
    chainId,
  });

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
  const hasOutdatedUi = useHasOutdatedUi();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!account || !bridgeOutChain || !bridgeOutParams) {
      helperToast.error(t`Error submitting withdrawal`);
      return;
    }

    const expressTxnParams = await expressTxnParamsAsyncResult.promise;

    if (expressTxnParams === undefined) {
      helperToast.error(t`Missing required parameters`);
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
    if (hasOutdatedUi) {
      return {
        text: t`Page outdated, please refresh`,
        disabled: true,
      };
    }

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

    if (bridgeOutChain === undefined) {
      return {
        text: t`Select network`,
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
    hasOutdatedUi,
    isCreatingTxn,
    bridgeOutInputValue,
    bridgeOutChain,
    gmxAccountMarketTokenBalance,
    marketTokenDecimals,
    bridgeOutAmount,
    errors?.isOutOfTokenError,
    expressTxnParamsAsyncResult.data,
  ]);

  if (!glvOrMarketInfo) {
    return null;
  }

  return (
    <SlideModal
      isVisible={isVisible}
      setIsVisible={setIsVisible}
      label={t`Withdraw ${glvOrGm}: ${getMarketIndexName(glvOrMarketInfo)}`}
      desktopContentClassName="w-[420px]"
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
          <span className="inline-flex items-center">
            <TokenIcon
              className="mr-5"
              symbol={isGlvInfo(glvOrMarketInfo) ? glvOrMarketInfo.glvToken.symbol : glvOrMarketInfo.indexToken.symbol}
              displaySize={20}
              chainIdBadge={0}
            />
            <SelectedPoolLabel glvOrMarketInfo={glvOrMarketInfo} />
          </span>
        </BuyInputSection>

        <DropdownSelector
          value={bridgeOutChain}
          onChange={(value) => {
            setBridgeOutChain(Number(value) as SourceChainId);
          }}
          placeholder={t`Select network`}
          button={
            <div className="flex items-center gap-8 text-14">
              {bridgeOutChain !== undefined ? (
                <>
                  <img src={getChainIcon(bridgeOutChain)} alt={getChainName(bridgeOutChain)} className="size-20" />
                  <div>
                    <Trans comment="to network">
                      <span className="text-typography-secondary">to </span>
                      <span>{getChainName(bridgeOutChain)}</span>
                    </Trans>
                  </div>
                </>
              ) : (
                <>
                  <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={20} height={20} borderRadius={10} />
                  <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={40} height={16} />
                </>
              )}
            </div>
          }
          options={networks}
          item={NetworkItem}
          itemKey={networkItemKey}
        />

        <Button className="w-full" type="submit" variant="primary-action" disabled={buttonState.disabled}>
          {buttonState.text}
        </Button>
        <SyntheticsInfoRow
          label={t`GMX Account Balance`}
          value={
            <ValueTransition
              from={
                gmxAccountMarketTokenBalance !== undefined && marketTokenDecimals !== undefined
                  ? formatBalanceAmount(gmxAccountMarketTokenBalance, marketTokenDecimals, glvOrGm)
                  : undefined
              }
              to={
                nextGmxAccountMarketTokenBalance !== undefined && marketTokenDecimals !== undefined
                  ? formatBalanceAmount(nextGmxAccountMarketTokenBalance, marketTokenDecimals, glvOrGm)
                  : undefined
              }
            />
          }
        />
      </form>
    </SlideModal>
  );
}

function networkItemKey(option: { id: number; name: string }) {
  return option.id;
}

function NetworkItem({ option }: { option: { id: number; name: string } }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-8">
        <img src={getChainIcon(option.id)} alt={option.name} className="size-20" />
        <span className="text-body-large">{option.name}</span>
      </div>
    </div>
  );
}

function useBridgeOutParams({
  bridgeOutChain,
  glvOrMarketAddress,
  bridgeOutAmount,
  chainId,
}: {
  bridgeOutChain: SourceChainId | undefined;
  glvOrMarketAddress: string | undefined;
  bridgeOutAmount: bigint | undefined;
  chainId: ContractsChainId;
}): BridgeOutParams | undefined {
  return useMemo(() => {
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
      token: glvOrMarketAddress,
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
}
