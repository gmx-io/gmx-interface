import { Trans } from "@lingui/macro";
import { useCallback } from "react";
import { Link } from "react-router-dom";
import { zeroAddress } from "viem";

import { ContractsChainId, getChainName, getViemChain, SourceChainId } from "config/chains";
import { JUMPER_BRIDGE_URL } from "config/links";
import { useGmxAccountDepositViewTokenAddress, useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { getNetworkFeeSource, getNetworkFeeSourceLabel } from "domain/synthetics/fees/networkFeeSource";
import { ValidationBannerErrorName } from "domain/synthetics/trade/utils/validation";
import { useGasPaymentTokensText } from "lib/gas/useGasPaymentTokensText";
import { useLocalizedList } from "lib/i18n";
import { getGasPaymentTokens } from "sdk/configs/express";
import { convertTokenAddress, getToken } from "sdk/configs/tokens";

import { ColorfulButtonLink } from "components/ColorfulBanner/ColorfulBanner";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { InsufficientWntBanner } from "components/GmxAccountModal/InsufficientWntBanner";

export function InsufficientNativeTokenBalanceMessage({ chainId }: { chainId: ContractsChainId }) {
  const [, setGmxAccountModalOpen] = useGmxAccountModalOpen();
  const nativeToken = getToken(chainId, zeroAddress);

  if (!nativeToken) {
    return null;
  }

  const nativeTokenSymbol = nativeToken.symbol;
  const chainName = getChainName(chainId);

  return (
    <div>
      <Trans>
        Insufficient {nativeTokenSymbol} in your Wallet for gas on {chainName}.{" "}
        <Link
          className="underline underline-offset-2"
          to={`/trade/swap?to=${nativeTokenSymbol}`}
          onClick={() => setGmxAccountModalOpen(false)}
        >
          Swap
        </Link>{" "}
        or <ExternalLink href={JUMPER_BRIDGE_URL}>bridge</ExternalLink> {nativeTokenSymbol}.
      </Trans>
    </div>
  );
}

export function InsufficientNativeTokenForApprovalMessage({
  chainId,
  approvalTokenAddress,
  alternativeGasTokenAddress,
  onSwitchGasToken,
}: {
  chainId: ContractsChainId;
  approvalTokenAddress: string;
  alternativeGasTokenAddress?: string;
  onSwitchGasToken?: () => void;
}) {
  const nativeTokenSymbol = getToken(chainId, zeroAddress).symbol;
  const approvalTokenSymbol = getToken(chainId, approvalTokenAddress).symbol;
  const alternativeGasTokenSymbol = alternativeGasTokenAddress
    ? getToken(chainId, alternativeGasTokenAddress).symbol
    : undefined;

  return (
    <div>
      <Trans>
        Insufficient {nativeTokenSymbol} in your Wallet to approve {approvalTokenSymbol}.{" "}
        <Link className="underline underline-offset-2" to={`/trade/swap?to=${nativeTokenSymbol}`}>
          Swap
        </Link>{" "}
        or <ExternalLink href={JUMPER_BRIDGE_URL}>bridge</ExternalLink> {nativeTokenSymbol}.
      </Trans>
      {alternativeGasTokenSymbol && onSwitchGasToken && (
        <>
          {" "}
          <ColorfulButtonLink color="blue" onClick={onSwitchGasToken}>
            <Trans>Use {alternativeGasTokenSymbol} for fees instead</Trans>
          </ColorfulButtonLink>
        </>
      )}
    </div>
  );
}

export function InsufficientWalletGasTokenBalanceMessage({
  chainId,
  gasPaymentTokenAddress,
  onBeforeNavigation,
}: {
  chainId: ContractsChainId;
  gasPaymentTokenAddress?: string;
  onBeforeNavigation?: () => void;
}) {
  const gasPaymentTokens = getGasPaymentTokens(chainId);
  const localizedList = useLocalizedList(gasPaymentTokens.map((token) => getToken(chainId, token).symbol));
  const selectedTokenSymbol = gasPaymentTokenAddress ? getToken(chainId, gasPaymentTokenAddress).symbol : undefined;
  const tokensText = selectedTokenSymbol ?? localizedList;
  const swapToSymbol = selectedTokenSymbol ?? getToken(chainId, gasPaymentTokens[0]).symbol;

  return (
    <div>
      <Trans>
        Insufficient {tokensText} in your Wallet for Express fees.{" "}
        <Link
          className="underline underline-offset-2"
          to={`/trade/swap?to=${swapToSymbol}`}
          onClick={onBeforeNavigation}
        >
          Swap
        </Link>{" "}
        or <ExternalLink href={JUMPER_BRIDGE_URL}>bridge</ExternalLink> {tokensText}.
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
        Insufficient {tokensText} for gas in your GMX Account{" "}
        <ColorfulButtonLink color="blue" onClick={handleDeposit}>
          Deposit {tokensText}
        </ColorfulButtonLink>
      </Trans>
    </div>
  );
}

export function InsufficientWalletTokenBalanceMessage({
  chainId,
  tokenAddress,
  onBeforeNavigation,
}: {
  chainId: ContractsChainId;
  tokenAddress: string;
  onBeforeNavigation?: () => void;
}) {
  const symbol = getToken(chainId, tokenAddress).symbol;

  return (
    <div>
      <Trans>
        Insufficient {symbol} in your Wallet for this transaction.{" "}
        <Link className="underline underline-offset-2" to={`/trade/swap?to=${symbol}`} onClick={onBeforeNavigation}>
          Swap
        </Link>{" "}
        or <ExternalLink href={JUMPER_BRIDGE_URL}>bridge</ExternalLink> {symbol}.
      </Trans>
    </div>
  );
}

export function InsufficientGmxAccountTokenBalanceMessage({
  chainId,
  tokenAddress,
  onBeforeNavigation,
}: {
  chainId: ContractsChainId;
  tokenAddress: string;
  onBeforeNavigation?: () => void;
}) {
  const [, setGmxAccountModalOpen] = useGmxAccountModalOpen();
  const [, setGmxAccountDepositViewTokenAddress] = useGmxAccountDepositViewTokenAddress();
  const symbol = getToken(chainId, tokenAddress).symbol;

  const handleDeposit = useCallback(() => {
    onBeforeNavigation?.();
    setGmxAccountDepositViewTokenAddress(convertTokenAddress(chainId, tokenAddress, "native"));
    setGmxAccountModalOpen("deposit");
  }, [chainId, onBeforeNavigation, setGmxAccountDepositViewTokenAddress, setGmxAccountModalOpen, tokenAddress]);

  return (
    <div>
      <Trans>
        Insufficient {symbol} in your GMX Account for this transaction.{" "}
        <ColorfulButtonLink color="blue" onClick={handleDeposit}>
          Deposit {symbol}
        </ColorfulButtonLink>
      </Trans>
    </div>
  );
}

export function InsufficientUnknownTokenBalanceMessage({
  chainId,
  isGmxAccount,
  gasPaymentTokenAddress,
  payTokenAddresses,
}: {
  chainId: ContractsChainId;
  isGmxAccount: boolean;
  gasPaymentTokenAddress: string;
  payTokenAddresses: string[];
}) {
  const gasTokenSymbol = getToken(chainId, gasPaymentTokenAddress).symbol;
  const payTokens = useLocalizedList(payTokenAddresses.map((tokenAddress) => getToken(chainId, tokenAddress).symbol));
  const sourceLabel = getNetworkFeeSourceLabel(getNetworkFeeSource({ isGmxAccount }));

  return (
    <div>
      <Trans>
        Not enough {payTokens} or {gasTokenSymbol} in your {sourceLabel}: this transaction spends {payTokens} and pays
        its network fee in {gasTokenSymbol}. Check both balances.
      </Trans>
    </div>
  );
}

export function InsufficientSourceChainNativeTokenBalanceMessage({
  srcChainId,
  onBeforeNavigation,
}: {
  srcChainId: SourceChainId;
  onBeforeNavigation?: () => void;
}) {
  const nativeToken = getViemChain(srcChainId).nativeCurrency;

  if (!nativeToken) {
    return null;
  }

  const nativeTokenSymbol = nativeToken.symbol;
  const chainName = getChainName(srcChainId);

  return (
    <div>
      <Trans>
        Insufficient {nativeTokenSymbol} on {chainName} for this transaction.{" "}
        <Link
          className="underline underline-offset-2"
          to={`/trade/swap?to=${nativeTokenSymbol}`}
          onClick={onBeforeNavigation}
        >
          Swap
        </Link>{" "}
        or <ExternalLink href={JUMPER_BRIDGE_URL}>bridge</ExternalLink> {nativeTokenSymbol}.
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
  approvalTokenAddress,
  alternativeGasTokenAddress,
  onSwitchGasToken,
}: {
  validationBannerErrorName: ValidationBannerErrorName;
  chainId: ContractsChainId;
  srcChainId?: SourceChainId;
  gasPaymentTokenAddress?: string;
  onBeforeNavigation?: () => void;
  approvalTokenAddress?: string;
  alternativeGasTokenAddress?: string;
  onSwitchGasToken?: () => void;
}) {
  switch (validationBannerErrorName) {
    case ValidationBannerErrorName.insufficientNativeTokenBalance: {
      return <InsufficientNativeTokenBalanceMessage chainId={chainId} />;
    }
    case ValidationBannerErrorName.insufficientNativeTokenForApproval: {
      if (!approvalTokenAddress) {
        return null;
      }

      return (
        <InsufficientNativeTokenForApprovalMessage
          chainId={chainId}
          approvalTokenAddress={approvalTokenAddress}
          alternativeGasTokenAddress={alternativeGasTokenAddress}
          onSwitchGasToken={onSwitchGasToken}
        />
      );
    }
    case ValidationBannerErrorName.insufficientWalletGasTokenBalance: {
      return (
        <InsufficientWalletGasTokenBalanceMessage
          chainId={chainId}
          gasPaymentTokenAddress={gasPaymentTokenAddress}
          onBeforeNavigation={onBeforeNavigation}
        />
      );
    }
    case ValidationBannerErrorName.insufficientSourceChainNativeTokenBalance: {
      if (!srcChainId) {
        return null;
      }

      return (
        <InsufficientSourceChainNativeTokenBalanceMessage
          srcChainId={srcChainId}
          onBeforeNavigation={onBeforeNavigation}
        />
      );
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
    case ValidationBannerErrorName.poolAtCapacity: {
      return (
        <div>
          <Trans>This pool is at maximum capacity and not accepting deposits right now. Try a different pool.</Trans>
        </div>
      );
    }
    default: {
      const _never: never = validationBannerErrorName;
      return null;
    }
  }
}
