import { t, Trans } from "@lingui/macro";
import { useEffect, useMemo, useState } from "react";
import { Address, encodeAbiParameters } from "viem";
import { useAccount } from "wagmi";

import { AnyChainId, getChainName, SettlementChainId, SourceChainId } from "config/chains";
import { getLayerZeroEndpointId, getStargatePoolAddress, isSourceChain } from "config/multichain";
import { useGmxAccountSettlementChainId } from "context/GmxAccountContext/hooks";
import { selectExpressGlobalParams } from "context/SyntheticsStateContext/selectors/expressSelectors";
import { selectDepositMarketTokensData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useArbitraryRelayParamsAndPayload } from "domain/multichain/arbitraryRelayParams";
import { BridgeOutParams } from "domain/multichain/types";
import { buildAndSignBridgeOutTxn } from "domain/synthetics/express/expressOrderUtils";
import { ExpressTransactionBuilder } from "domain/synthetics/express/types";
import { getGlvOrMarketAddress, GlvOrMarketInfo } from "domain/synthetics/markets";
import { createBridgeOutTxn } from "domain/synthetics/markets/createBridgeOutTxn";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { convertToUsd, getMidPrice, getTokenData } from "domain/tokens";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { getMarketIndexName } from "sdk/utils/markets";
import { formatAmountFree, formatBalanceAmount, formatUsd, parseValue } from "sdk/utils/numbers";

import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { useMultichainMarketTokenBalancesRequest } from "components/GmxAccountModal/hooks";
import { wrapChainAction } from "components/GmxAccountModal/wrapChainAction";
import { SlideModal } from "components/Modal/SlideModal";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import { MultichainMarketTokenSelector } from "components/TokenSelector/MultichainMarketTokenSelector";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

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
  const globalExpressParams = useSelector(selectExpressGlobalParams);
  const [bridgeOutChain, setBridgeOutChain] = useState<SourceChainId | undefined>(srcChainId);
  const [bridgeOutInputValue, setBridgeOutInputValue] = useState("");

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
    glvOrMarketAddress
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
      minAmountOut: bridgeOutAmount,
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
    if (
      account === undefined ||
      bridgeOutParams === undefined ||
      // provider === undefined ||
      bridgeOutChain === undefined
    ) {
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
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (
      !account ||
      !glvOrMarketAddress ||
      bridgeOutAmount === undefined ||
      !bridgeOutChain ||
      !globalExpressParams ||
      !bridgeOutParams
    ) {
      return;
    }

    const expressTxnParams = await expressTxnParamsAsyncResult.promise;

    if (expressTxnParams === undefined) {
      helperToast.error("Missing required parameters");
      return;
    }

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
  };

  useEffect(() => {
    if (bridgeOutChain === undefined && srcChainId !== undefined) {
      setBridgeOutChain(srcChainId);
    }
  }, [bridgeOutChain, srcChainId]);

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
          bottomRightValue={
            gmxAccountMarketTokenBalance !== undefined && marketTokenDecimals !== undefined
              ? formatBalanceAmount(gmxAccountMarketTokenBalance, marketTokenDecimals)
              : undefined
          }
          bottomRightLabel={t`Available`}
          onClickMax={() => {
            if (gmxAccountMarketTokenBalance === undefined || marketTokenDecimals === undefined) {
              return;
            }
            setBridgeOutInputValue(formatAmountFree(gmxAccountMarketTokenBalance, marketTokenDecimals));
          }}
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
        <Button className="w-full" type="submit" variant="primary-action">
          <Trans>Enter an amount</Trans>
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
