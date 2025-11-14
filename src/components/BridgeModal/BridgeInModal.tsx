import { t } from "@lingui/macro";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";

import { AnyChainId, SettlementChainId, SourceChainId } from "config/chains";
import { isSourceChain } from "config/multichain";
import { useGmxAccountSettlementChainId } from "context/GmxAccountContext/hooks";
import { selectExpressGlobalParams } from "context/SyntheticsStateContext/selectors/expressSelectors";
import { selectDepositMarketTokensData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getGlvOrMarketAddress, GlvOrMarketInfo } from "domain/synthetics/markets";
import { createBridgeInTxn } from "domain/synthetics/markets/createBridgeInTxn";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { convertToUsd, getMidPrice, getTokenData } from "domain/tokens";
import { useChainId } from "lib/chains";
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

export function BridgeInModal({
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
  const [bridgeInChain, setBridgeInChain] = useState<SourceChainId | undefined>(srcChainId);
  const [bridgeInInputValue, setBridgeInInputValue] = useState("");

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

  const bridgeInAmount = useMemo(() => {
    return bridgeInInputValue && marketTokenDecimals !== undefined
      ? parseValue(bridgeInInputValue, marketTokenDecimals)
      : undefined;
  }, [bridgeInInputValue, marketTokenDecimals]);

  const bridgeInUsd = useMemo(() => {
    return bridgeInAmount !== undefined && marketTokenDecimals !== undefined
      ? convertToUsd(bridgeInAmount, marketTokenDecimals, marketTokenPrice)
      : undefined;
  }, [bridgeInAmount, marketTokenDecimals, marketTokenPrice]);

  const glvOrGm = isGlv ? "GLV" : "GM";
  const { address: account } = useAccount();

  const { tokenBalancesData: marketTokenBalancesData } = useMultichainMarketTokenBalancesRequest(
    chainId,
    srcChainId,
    account,
    glvOrMarketAddress
  );

  const sourceChainMarketTokenBalancesData: Partial<Record<0 | AnyChainId, bigint>> = useMemo(() => {
    return {
      ...marketTokenBalancesData,
      [chainId]: undefined,
      [0]: undefined,
    };
  }, [chainId, marketTokenBalancesData]);

  const bridgeInChainMarketTokenBalance: bigint | undefined = bridgeInChain
    ? marketTokenBalancesData[bridgeInChain]
    : undefined;

  const gmxAccountMarketTokenBalance: bigint | undefined = marketTokenBalancesData[0];

  const nextGmxAccountMarketTokenBalance: bigint | undefined =
    gmxAccountMarketTokenBalance !== undefined && bridgeInAmount !== undefined
      ? gmxAccountMarketTokenBalance + bridgeInAmount
      : undefined;

  if (!glvOrMarketInfo) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!account || !glvOrMarketAddress || bridgeInAmount === undefined || !bridgeInChain || !globalExpressParams) {
      return;
    }
    await wrapChainAction(bridgeInChain, setSettlementChainId, async (signer) => {
      await createBridgeInTxn({
        chainId: chainId as SettlementChainId,
        srcChainId: bridgeInChain,
        account,
        tokenAddress: glvOrMarketAddress,
        tokenAmount: bridgeInAmount,
        signer,
        globalExpressParams,
      });
    });
  };

  return (
    <SlideModal
      isVisible={isVisible}
      setIsVisible={setIsVisible}
      label={t`Deposit ${glvOrGm}: ${getMarketIndexName(glvOrMarketInfo)}`}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-12">
        <BuyInputSection
          topLeftLabel={t`Deposit`}
          inputValue={bridgeInInputValue}
          onInputValueChange={(e) => setBridgeInInputValue(e.target.value)}
          bottomLeftValue={formatUsd(bridgeInUsd)}
          bottomRightValue={
            bridgeInChainMarketTokenBalance !== undefined && marketTokenDecimals !== undefined
              ? formatBalanceAmount(bridgeInChainMarketTokenBalance, marketTokenDecimals)
              : undefined
          }
          bottomRightLabel={t`Available`}
          onClickMax={() => {
            if (bridgeInChainMarketTokenBalance === undefined || marketTokenDecimals === undefined) {
              return;
            }
            setBridgeInInputValue(formatAmountFree(bridgeInChainMarketTokenBalance, marketTokenDecimals));
          }}
        >
          <MultichainMarketTokenSelector
            chainId={chainId}
            srcChainId={bridgeInChain}
            paySource={"sourceChain"}
            onSelectTokenAddress={(newBridgeInChain) => {
              if (!isSourceChain(newBridgeInChain)) {
                return;
              }
              setBridgeInChain(newBridgeInChain);
            }}
            marketInfo={glvOrMarketInfo}
            marketTokenPrice={marketTokenPrice}
            tokenBalancesData={sourceChainMarketTokenBalancesData}
          />
        </BuyInputSection>
        <Button className="w-full" type="submit" variant="primary-action">
          Enter an amount
        </Button>
        <SyntheticsInfoRow
          label={t`GMX Account Balance`}
          value={
            <ValueTransition
              from={
                gmxAccountMarketTokenBalance !== undefined && marketTokenDecimals !== undefined
                  ? formatBalanceAmount(gmxAccountMarketTokenBalance, marketTokenDecimals)
                  : undefined
              }
              to={
                nextGmxAccountMarketTokenBalance !== undefined && marketTokenDecimals !== undefined
                  ? formatBalanceAmount(nextGmxAccountMarketTokenBalance, marketTokenDecimals)
                  : undefined
              }
            />
          }
        />
      </form>
    </SlideModal>
  );
}
