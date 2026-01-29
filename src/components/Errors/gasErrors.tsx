import { Trans } from "@lingui/macro";
import { useCallback } from "react";
import { zeroAddress } from "viem";

import { ContractsChainId, getChainName, getViemChain, SourceChainId } from "config/chains";
import { useGmxAccountDepositViewTokenAddress, useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { ValidationBannerErrorName } from "domain/synthetics/trade/utils/validation";
import { useGasPaymentTokensText } from "lib/gas/useGasPaymentTokensText";
import { useLocalizedList } from "lib/i18n";
import { getMatchaBuyTokenUrl } from "lib/matcha";
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
  const matchaBuyTokenUrl = getMatchaBuyTokenUrl(chainId, zeroAddress);

  return (
    <div>
      <Trans>
        Insufficient {nativeTokenSymbol} for gas in your wallet on {getChainName(chainId)}.{" "}
        <ExternalLink href={matchaBuyTokenUrl}>Buy {nativeTokenSymbol}</ExternalLink>
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
        Insufficient {localizedList} for gas in your wallet on {chainName}.{" "}
        <ExternalLink href={getMatchaBuyTokenUrl(chainId, firstGasPaymentToken)}>Buy {localizedList}</ExternalLink>
      </Trans>
    </div>
  );
}

export function InsufficientGmxAccountGasTokenBalanceMessage({
  chainId,
  gasPaymentTokenAddress,
}: {
  chainId: ContractsChainId;
  gasPaymentTokenAddress?: string;
}) {
  const { gasPaymentTokensText } = useGasPaymentTokensText(chainId);
  const [, setGmxAccountModalOpen] = useGmxAccountModalOpen();
  const [, setGmxAccountDepositViewTokenAddress] = useGmxAccountDepositViewTokenAddress();

  let tokensText = gasPaymentTokenAddress ? getToken(chainId, gasPaymentTokenAddress).symbol : gasPaymentTokensText;

  const handleDeposit = useCallback(() => {
    if (gasPaymentTokenAddress) {
      setGmxAccountDepositViewTokenAddress(convertTokenAddress(chainId, gasPaymentTokenAddress, "native"));
    }
    setGmxAccountModalOpen("deposit");
  }, [chainId, gasPaymentTokenAddress, setGmxAccountDepositViewTokenAddress, setGmxAccountModalOpen]);

  return (
    <div>
      <Trans>
        Insufficient {tokensText} for gas in your GMX Account.{" "}
        <button className="cursor-pointer underline underline-offset-2" onClick={handleDeposit}>
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
  const matchaBuyTokenUrl = getMatchaBuyTokenUrl(srcChainId, zeroAddress);

  return (
    <div>
      <Trans>
        Insufficient {nativeTokenSymbol} for gas in your wallet on {getChainName(srcChainId)}.{" "}
        <ExternalLink href={matchaBuyTokenUrl}>Buy {nativeTokenSymbol}</ExternalLink>
      </Trans>
    </div>
  );
}

export function ValidationBannerErrorContent({
  validationBannerErrorName,
  chainId,
  srcChainId,
  gasPaymentTokenAddress,
}: {
  validationBannerErrorName: ValidationBannerErrorName;
  chainId: ContractsChainId;
  srcChainId?: SourceChainId;
  gasPaymentTokenAddress?: string;
}) {
  switch (validationBannerErrorName) {
    case ValidationBannerErrorName.insufficientNativeTokenBalance: {
      return <InsufficientNativeTokenBalanceMessage chainId={chainId} />;
    }
    case ValidationBannerErrorName.insufficientWalletGasTokenBalance: {
      return <InsufficientWalletGasTokenBalanceMessage chainId={chainId} />;
    }
    case ValidationBannerErrorName.insufficientGmxAccountSomeGasTokenBalance: {
      return <InsufficientGmxAccountGasTokenBalanceMessage chainId={chainId} />;
    }
    case ValidationBannerErrorName.insufficientSourceChainNativeTokenBalance: {
      if (!srcChainId) {
        return null;
      }

      return <InsufficientSourceChainNativeTokenBalanceMessage srcChainId={srcChainId} />;
    }
    case ValidationBannerErrorName.insufficientGmxAccountWntBalance: {
      return <InsufficientWntBanner chainId={chainId} />;
    }
    case ValidationBannerErrorName.insufficientGmxAccountCurrentGasTokenBalance: {
      return (
        <InsufficientGmxAccountGasTokenBalanceMessage
          chainId={chainId}
          gasPaymentTokenAddress={gasPaymentTokenAddress}
        />
      );
    }
    default: {
      const _never: never = validationBannerErrorName;
      return null;
    }
  }
}
