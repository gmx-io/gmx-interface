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
import { SlideModal } from "components/Modal/SlideModal";
import { useMultichainMarketTokenBalancesRequest } from "components/Synthetics/GmxAccountModal/hooks";
import { wrapChainAction } from "components/Synthetics/GmxAccountModal/wrapChainAction";
import { SyntheticsInfoRow } from "components/Synthetics/SyntheticsInfoRow";
import { MultichainMarketTokenSelector } from "components/TokenSelector/MultichainMarketTokenSelector";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

export function TransferInModal({
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
  const [transferInChain, setTransferInChain] = useState<SourceChainId | undefined>();
  const [transferInInputValue, setTransferInInputValue] = useState("");

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

  const transferInAmount = useMemo(() => {
    return transferInInputValue && marketTokenDecimals !== undefined
      ? parseValue(transferInInputValue, marketTokenDecimals)
      : undefined;
  }, [transferInInputValue, marketTokenDecimals]);

  const transferInUsd = useMemo(() => {
    return transferInAmount !== undefined && marketTokenDecimals !== undefined
      ? convertToUsd(transferInAmount, marketTokenDecimals, marketTokenPrice)
      : undefined;
  }, [transferInAmount, marketTokenDecimals, marketTokenPrice]);

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

  const transferInChainMarketTokenBalance: bigint | undefined = transferInChain
    ? marketTokenBalancesData[transferInChain]
    : undefined;

  const gmxAccountMarketTokenBalance: bigint | undefined = marketTokenBalancesData[0];

  const nextGmxAccountMarketTokenBalance: bigint | undefined =
    gmxAccountMarketTokenBalance !== undefined && transferInAmount !== undefined
      ? gmxAccountMarketTokenBalance + transferInAmount
      : undefined;

  if (!glvOrMarketInfo) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!account || !glvOrMarketAddress || transferInAmount === undefined || !transferInChain || !globalExpressParams) {
      return;
    }
    await wrapChainAction(transferInChain, setSettlementChainId, async (signer) => {
      await createBridgeInTxn({
        chainId: chainId as SettlementChainId,
        srcChainId: transferInChain,
        account,
        tokenAddress: glvOrMarketAddress,
        tokenAmount: transferInAmount,
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
          inputValue={transferInInputValue}
          onInputValueChange={(e) => setTransferInInputValue(e.target.value)}
          bottomLeftValue={formatUsd(transferInUsd)}
          bottomRightValue={
            transferInChainMarketTokenBalance !== undefined && marketTokenDecimals !== undefined
              ? formatBalanceAmount(transferInChainMarketTokenBalance, marketTokenDecimals)
              : undefined
          }
          bottomRightLabel={t`Available`}
          onClickMax={() => {
            if (transferInChainMarketTokenBalance === undefined || marketTokenDecimals === undefined) {
              return;
            }
            setTransferInInputValue(formatAmountFree(transferInChainMarketTokenBalance, marketTokenDecimals));
          }}
        >
          <MultichainMarketTokenSelector
            chainId={chainId}
            srcChainId={transferInChain}
            paySource={"sourceChain"}
            onSelectTokenAddress={(newTransferInChain) => {
              if (!isSourceChain(newTransferInChain)) {
                return;
              }
              setTransferInChain(newTransferInChain);
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
