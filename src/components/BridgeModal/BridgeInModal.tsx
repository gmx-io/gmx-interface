import { t } from "@lingui/macro";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";

import {
  type AnyChainId,
  GMX_ACCOUNT_PSEUDO_CHAIN_ID,
  type GmxAccountPseudoChainId,
  type SettlementChainId,
  type SourceChainId,
} from "config/chains";
import { getSourceChainDecimalsMapped, isSourceChain } from "config/multichain";
import { useGmxAccountSettlementChainId } from "context/GmxAccountContext/hooks";
import { PLATFORM_TOKEN_DECIMALS } from "context/PoolsDetailsContext/selectors";
import { selectMultichainMarketTokenBalances } from "context/PoolsDetailsContext/selectors/selectMultichainMarketTokenBalances";
import { selectDepositMarketTokensData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useNativeTokenMultichainUsd } from "domain/multichain/useMultichainQuoteFeeUsd";
import { useSourceChainError } from "domain/multichain/useSourceChainError";
import { getGlvOrMarketAddress, GlvOrMarketInfo } from "domain/synthetics/markets";
import { createBridgeInTxn, getBridgeInTxnParams } from "domain/synthetics/markets/createBridgeInTxn";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { convertToUsd, getMidPrice, getTokenData } from "domain/tokens";
import { useMaxAvailableAmount } from "domain/tokens/useMaxAvailableAmount";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { EMPTY_OBJECT } from "lib/objects";
import { useThrottledAsync } from "lib/useThrottledAsync";
import { getMarketIndexName } from "sdk/utils/markets";
import { adjustForDecimals, formatBalanceAmount, formatUsd, parseValue } from "sdk/utils/numbers";

import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { getTxnErrorToast } from "components/Errors/errorToasts";
import { wrapChainAction } from "components/GmxAccountModal/wrapChainAction";
import { SlideModal } from "components/Modal/SlideModal";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import { MultichainMarketTokenSelector } from "components/TokenSelector/MultichainMarketTokenSelector";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import SpinnerIcon from "img/ic_spinner.svg?react";

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
  const [bridgeInChain, setBridgeInChain] = useState<SourceChainId | undefined>(srcChainId);
  const [bridgeInInputValue, setBridgeInInputValue] = useState("");
  const [isCreatingTxn, setIsCreatingTxn] = useState(false);

  const depositMarketTokensData = useSelector(selectDepositMarketTokensData);
  const glvOrMarketAddress = glvOrMarketInfo ? getGlvOrMarketAddress(glvOrMarketInfo) : undefined;
  const marketToken = getTokenData(depositMarketTokensData, glvOrMarketAddress);
  const isGlv = isGlvInfo(glvOrMarketInfo);

  let marketTokenPrice: bigint | undefined = undefined;
  if (isGlv && glvOrMarketInfo?.glvToken.prices) {
    marketTokenPrice = getMidPrice(glvOrMarketInfo?.glvToken.prices);
  } else if (marketToken?.prices) {
    marketTokenPrice = getMidPrice(marketToken?.prices);
  }

  const bridgeInAmount = useMemo(() => {
    return bridgeInInputValue && PLATFORM_TOKEN_DECIMALS !== undefined
      ? parseValue(bridgeInInputValue, PLATFORM_TOKEN_DECIMALS)
      : undefined;
  }, [bridgeInInputValue]);

  const bridgeInUsd = useMemo(() => {
    return bridgeInAmount !== undefined && PLATFORM_TOKEN_DECIMALS !== undefined
      ? convertToUsd(bridgeInAmount, PLATFORM_TOKEN_DECIMALS, marketTokenPrice)
      : undefined;
  }, [bridgeInAmount, marketTokenPrice]);

  const glvOrGm = isGlv ? "GLV" : "GM";
  const { address: account } = useAccount();

  const multichainMarketTokensBalances = useSelector(selectMultichainMarketTokenBalances);
  const multichainMarketTokenBalances = glvOrMarketAddress
    ? multichainMarketTokensBalances[glvOrMarketAddress]
    : undefined;

  const bridgeInChainMarketTokenBalance: bigint | undefined = bridgeInChain
    ? multichainMarketTokenBalances?.balances[bridgeInChain]?.balance
    : undefined;

  const sourceChainBalancesForSelector: Partial<Record<AnyChainId | GmxAccountPseudoChainId, bigint>> =
    multichainMarketTokenBalances?.balances
      ? Object.fromEntries(
          Object.entries(multichainMarketTokenBalances.balances)
            .filter(([chainIdStr, data]) => {
              const chainIdNum = Number(chainIdStr);
              return data && chainIdNum !== chainId && chainIdNum !== GMX_ACCOUNT_PSEUDO_CHAIN_ID;
            })
            .map(([chainIdStr, data]) => [chainIdStr, data.balance])
        )
      : EMPTY_OBJECT;

  const sourceChainDecimals =
    bridgeInChain && glvOrMarketAddress
      ? getSourceChainDecimalsMapped(chainId, bridgeInChain, glvOrMarketAddress)
      : undefined;

  const gmxAccountMarketTokenBalance: bigint | undefined =
    multichainMarketTokenBalances?.balances[GMX_ACCOUNT_PSEUDO_CHAIN_ID]?.balance;

  const nextGmxAccountMarketTokenBalance: bigint | undefined =
    gmxAccountMarketTokenBalance !== undefined && bridgeInAmount !== undefined
      ? gmxAccountMarketTokenBalance + bridgeInAmount
      : undefined;

  const { formattedBalance, formattedMaxAvailableAmount, showClickMax } = useMaxAvailableAmount({
    fromToken: marketToken,
    fromTokenAmount: bridgeInAmount ?? 0n,
    fromTokenInputValue: bridgeInInputValue,
    nativeToken: undefined,
    minResidualAmount: undefined,
    isLoading: false,
    srcChainId: bridgeInChain,
    balance: bridgeInChainMarketTokenBalance,
  });

  const nativeFeeAsyncResult = useThrottledAsync(
    async ({ params: p }) => {
      if (!p.account || !p.glvOrMarketAddress || p.bridgeInAmount === undefined || !p.bridgeInChain || !p.chainId) {
        return undefined;
      }

      const { nativeFee } = await getBridgeInTxnParams({
        chainId: p.chainId as SettlementChainId,
        srcChainId: p.bridgeInChain,
        account: p.account,
        tokenAddress: p.glvOrMarketAddress,
        tokenAmount: p.bridgeInAmount,
      });

      return nativeFee;
    },
    {
      params:
        account && glvOrMarketAddress && bridgeInAmount !== undefined && bridgeInChain && chainId
          ? {
              account,
              glvOrMarketAddress,
              bridgeInAmount,
              bridgeInChain,
              chainId,
            }
          : undefined,
      throttleMs: 5000,
      leading: true,
      trailing: false,
    }
  );

  const nativeFee = nativeFeeAsyncResult.data;
  const nativeFeeUsd = useNativeTokenMultichainUsd({
    sourceChainId: bridgeInChain,
    sourceChainTokenAmount: nativeFee,
    targetChainId: chainId,
  });

  const nativeBalanceError = useSourceChainError({
    networkFeeUsd: nativeFeeUsd,
    paySource: "sourceChain",
    chainId,
    srcChainId: bridgeInChain,
  });

  useEffect(() => {
    if (bridgeInChain !== undefined || !multichainMarketTokenBalances?.balances) {
      return;
    }

    const firstChainWithBalance = Object.entries(multichainMarketTokenBalances.balances).find(([chainIdStr, data]) => {
      const chainIdNum = Number(chainIdStr);
      if (
        !isSourceChain(chainIdNum) ||
        (chainIdNum as number) === chainId ||
        (chainIdNum as number) === GMX_ACCOUNT_PSEUDO_CHAIN_ID
      ) {
        return false;
      }
      return data?.balance !== undefined && data.balance > 0n;
    });

    if (firstChainWithBalance) {
      setBridgeInChain(Number(firstChainWithBalance[0]) as SourceChainId);
    }
  }, [bridgeInChain, chainId, multichainMarketTokenBalances]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!account || !glvOrMarketAddress || bridgeInAmount === undefined || !bridgeInChain) {
      helperToast.error(t`Error submitting deposit`);
      return;
    }
    try {
      setIsCreatingTxn(true);
      await wrapChainAction(bridgeInChain, setSettlementChainId, async (signer) => {
        await createBridgeInTxn({
          chainId: chainId as SettlementChainId,
          srcChainId: bridgeInChain,
          account,
          tokenAddress: glvOrMarketAddress,
          tokenAmount: bridgeInAmount,
          signer,
        });
      });
    } catch (error) {
      const toastParams = getTxnErrorToast(chainId, error, { defaultMessage: t`Error submitting deposit` });
      helperToast.error(toastParams.errorContent, {
        autoClose: toastParams.autoCloseToast,
      });
    } finally {
      setIsCreatingTxn(false);
    }
  };

  const buttonState = useMemo((): { text: ReactNode; disabled?: boolean } => {
    if (isCreatingTxn) {
      return {
        text: (
          <>
            {t`Depositing`}
            <SpinnerIcon className="ml-4 animate-spin" />
          </>
        ),
        disabled: true,
      };
    }

    if (!bridgeInInputValue) {
      return {
        text: t`Enter an amount`,
        disabled: true,
      };
    }

    if (bridgeInChain === undefined) {
      return {
        text: t`Select network`,
        disabled: true,
      };
    }

    if (
      bridgeInChainMarketTokenBalance === undefined ||
      bridgeInAmount === undefined ||
      sourceChainDecimals === undefined ||
      bridgeInAmount > adjustForDecimals(bridgeInChainMarketTokenBalance, sourceChainDecimals, PLATFORM_TOKEN_DECIMALS)
    ) {
      return {
        text: t`Insufficient balance`,
        disabled: true,
      };
    }

    if (nativeBalanceError) {
      return {
        text: nativeBalanceError,
        disabled: true,
      };
    }

    return {
      text: t`Deposit`,
      disabled: false,
    };
  }, [
    isCreatingTxn,
    bridgeInInputValue,
    bridgeInChain,
    bridgeInChainMarketTokenBalance,
    bridgeInAmount,
    sourceChainDecimals,
    nativeBalanceError,
  ]);

  if (!glvOrMarketInfo) {
    return null;
  }

  return (
    <SlideModal
      isVisible={isVisible}
      setIsVisible={setIsVisible}
      label={t`Deposit ${glvOrGm}: ${getMarketIndexName(glvOrMarketInfo)}`}
      desktopContentClassName="w-[420px]"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-12">
        <BuyInputSection
          topLeftLabel={t`Deposit`}
          inputValue={bridgeInInputValue}
          onInputValueChange={(e) => setBridgeInInputValue(e.target.value)}
          bottomLeftValue={formatUsd(bridgeInUsd)}
          bottomRightValue={formattedBalance}
          bottomRightLabel={t`Available`}
          onClickMax={
            showClickMax
              ? () => {
                  setBridgeInInputValue(formattedMaxAvailableAmount);
                }
              : undefined
          }
        >
          <MultichainMarketTokenSelector
            chainId={chainId}
            srcChainId={bridgeInChain}
            paySource={"sourceChain"}
            label={t`Deposit`}
            onSelectTokenAddress={(newBridgeInChain) => {
              if (!isSourceChain(newBridgeInChain)) {
                return;
              }
              setBridgeInChain(newBridgeInChain);
            }}
            marketInfo={glvOrMarketInfo}
            marketTokenPrice={marketTokenPrice}
            tokenBalancesData={sourceChainBalancesForSelector}
            hideTabs
          />
        </BuyInputSection>
        <Button className="w-full" type="submit" variant="primary-action" disabled={buttonState.disabled}>
          {buttonState.text}
        </Button>
        <SyntheticsInfoRow label={t`Network Fee`} value={formatUsd(nativeFeeUsd)} />
        <SyntheticsInfoRow
          label={t`GMX Account Balance`}
          value={
            <ValueTransition
              from={
                gmxAccountMarketTokenBalance !== undefined && PLATFORM_TOKEN_DECIMALS !== undefined
                  ? formatBalanceAmount(gmxAccountMarketTokenBalance, PLATFORM_TOKEN_DECIMALS, glvOrGm)
                  : undefined
              }
              to={
                nextGmxAccountMarketTokenBalance !== undefined && PLATFORM_TOKEN_DECIMALS !== undefined
                  ? formatBalanceAmount(nextGmxAccountMarketTokenBalance, PLATFORM_TOKEN_DECIMALS, glvOrGm)
                  : undefined
              }
            />
          }
        />
      </form>
    </SlideModal>
  );
}
