import { Trans } from "@lingui/macro";
import { useCallback } from "react";
import { zeroAddress } from "viem";

import { ContractsChainId, getChainName, getViemChain, SourceChainId } from "config/chains";
import { useGmxAccountDepositViewTokenAddress, useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { ValidationBannerErrorName } from "domain/synthetics/trade/utils/validation";
import { getExternalAggregatorBuyTokenUrl } from "lib/externalAggregator";
import { useGasPaymentTokensText } from "lib/gas/useGasPaymentTokensText";
import { useLocalizedList } from "lib/i18n";
import { getGasPaymentTokens } from "sdk/configs/express";
import { convertTokenAddress, getToken } from "sdk/configs/tokens";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { InsufficientWntBanner } from "components/GmxAccountModal/InsufficientWntBanner";

export function InsufficientNativeTokenBalanceMessage({ chainId }: { chainId: ContractsChainId }) {
  const nativeToken = getToken(chainId, zeroAddress);

  if (!nativeToken) {
    return null;
  }

  const nativeTokenSymbol = nativeToken.symbol;
  const externalAggregatorBuyTokenUrl = getExternalAggregatorBuyTokenUrl(chainId, zeroAddress);

  return (
    <div>
      <Trans>
        Insufficient {nativeTokenSymbol} for gas on {getChainName(chainId)}.{" "}
        <ExternalLink href={externalAggregatorBuyTokenUrl}>Buy {nativeTokenSymbol}</ExternalLink>
      </Trans>
    </div>
  );
}

export function InsufficientWalletGasTokenBalanceMessage({ chainId }: { chainId: ContractsChainId }) {
  const gasPaymentTokens = getGasPaymentTokens(chainId);
  const localizedList = useLocalizedList(gasPaymentTokens.map((token) => getToken(chainId, token).symbol));
  const chainName = getChainName(chainId);
  const firstGasPaymentToken = gasPaymentTokens[0];

  return (
    <div>
      <Trans>
        Insufficient {localizedList} for gas on {chainName}.{" "}
        <ExternalLink href={getExternalAggregatorBuyTokenUrl(chainId, firstGasPaymentToken)}>
          Buy {localizedList}
        </ExternalLink>
      </Trans>
    </div>
  );
}

export function InsufficientGmxAccountGasTokenBalanceMessage({
  chainId,
  gasPaymentTokenAddress,
  onBeforeNavigation,
}: {
  chainId: ContractsChainId;
  gasPaymentTokenAddress?: string;
  onBeforeNavigation?: () => void;
}) {
  const { gasPaymentTokensText } = useGasPaymentTokensText(chainId);
  const [, setGmxAccountModalOpen] = useGmxAccountModalOpen();
  const [, setGmxAccountDepositViewTokenAddress] = useGmxAccountDepositViewTokenAddress();

  let tokensText = gasPaymentTokenAddress ? getToken(chainId, gasPaymentTokenAddress).symbol : gasPaymentTokensText;

  const handleDeposit = useCallback(() => {
    onBeforeNavigation?.();
    if (gasPaymentTokenAddress) {
      setGmxAccountDepositViewTokenAddress(convertTokenAddress(chainId, gasPaymentTokenAddress, "native"));
    }
    setGmxAccountModalOpen("deposit");
  }, [
    chainId,
    gasPaymentTokenAddress,
    onBeforeNavigation,
    setGmxAccountDepositViewTokenAddress,
    setGmxAccountModalOpen,
  ]);

  return (
    <div>
      <Trans>
        Insufficient {tokensText} for gas in your GMX Account.{" "}
        <button className="cursor-pointer underline underline-offset-2" type="button" onClick={handleDeposit}>
          Deposit {tokensText}
        </button>
      </Trans>
    </div>
  );
}

export function InsufficientSourceChainNativeTokenBalanceMessage({ srcChainId }: { srcChainId: SourceChainId }) {
  const nativeToken = getViemChain(srcChainId).nativeCurrency;

  if (!nativeToken) {
    return null;
  }

  const nativeTokenSymbol = nativeToken.symbol;
  const externalAggregatorBuyTokenUrl = getExternalAggregatorBuyTokenUrl(srcChainId, zeroAddress);

  return (
    <div>
      <Trans>
        Insufficient {nativeTokenSymbol} for gas on {getChainName(srcChainId)}.{" "}
        <ExternalLink href={externalAggregatorBuyTokenUrl}>Buy {nativeTokenSymbol}</ExternalLink>
      </Trans>
    </div>
  );
}

export function ValidationBannerErrorContent({
  validationBannerErrorName,
  chainId,
  srcChainId,
  gasPaymentTokenAddress,
  onBeforeNavigation,
}: {
  validationBannerErrorName: ValidationBannerErrorName;
  chainId: ContractsChainId;
  srcChainId?: SourceChainId;
  gasPaymentTokenAddress?: string;
  onBeforeNavigation?: () => void;
}) {
  switch (validationBannerErrorName) {
    case ValidationBannerErrorName.insufficientNativeTokenBalance: {
      return <InsufficientNativeTokenBalanceMessage chainId={chainId} />;
    }
    case ValidationBannerErrorName.insufficientWalletGasTokenBalance: {
      return <InsufficientWalletGasTokenBalanceMessage chainId={chainId} />;
    }
    case ValidationBannerErrorName.insufficientGmxAccountSomeGasTokenBalance: {
      return <InsufficientGmxAccountGasTokenBalanceMessage chainId={chainId} onBeforeNavigation={onBeforeNavigation} />;
    }
    case ValidationBannerErrorName.insufficientSourceChainNativeTokenBalance: {
      if (!srcChainId) {
        return null;
      }

      return <InsufficientSourceChainNativeTokenBalanceMessage srcChainId={srcChainId} />;
    }
    case ValidationBannerErrorName.insufficientGmxAccountWntBalance: {
      return <InsufficientWntBanner chainId={chainId} onBeforeNavigation={onBeforeNavigation} />;
    }
    case ValidationBannerErrorName.insufficientGmxAccountCurrentGasTokenBalance: {
      return (
        <InsufficientGmxAccountGasTokenBalanceMessage
          chainId={chainId}
          gasPaymentTokenAddress={gasPaymentTokenAddress}
          onBeforeNavigation={onBeforeNavigation}
        />
      );
    }
    default: {
      const _never: never = validationBannerErrorName;
      return null;
    }
  }
}
