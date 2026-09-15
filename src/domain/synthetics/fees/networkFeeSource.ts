import { t } from "@lingui/macro";

import { getChainName, getViemChain, type ContractsChainId, type SourceChainId } from "config/chains";
import { TokenBalanceType } from "domain/tokens";
import { getNativeToken } from "sdk/configs/tokens";

export type NetworkFeeSource =
  | { balanceType: TokenBalanceType.Wallet }
  | { balanceType: TokenBalanceType.GmxAccount }
  | { balanceType: TokenBalanceType.SourceChain; chainId: SourceChainId };

export type NetworkFeeDetails = {
  amount: bigint;
  usd: bigint;
  decimals: number;
  symbol: string;
  isStable?: boolean;
};

export const WALLET_NETWORK_FEE_SOURCE: NetworkFeeSource = { balanceType: TokenBalanceType.Wallet };
export const GMX_ACCOUNT_NETWORK_FEE_SOURCE: NetworkFeeSource = { balanceType: TokenBalanceType.GmxAccount };

export function getSourceChainNetworkFeeSource(chainId: SourceChainId): NetworkFeeSource {
  return { balanceType: TokenBalanceType.SourceChain, chainId };
}

export function getNetworkFeeSource({ isGmxAccount }: { isGmxAccount: boolean }): NetworkFeeSource {
  return isGmxAccount ? GMX_ACCOUNT_NETWORK_FEE_SOURCE : WALLET_NETWORK_FEE_SOURCE;
}

export function getNetworkFeeSourceLabel(source: NetworkFeeSource): string {
  switch (source.balanceType) {
    case TokenBalanceType.Wallet:
      return t`Wallet`;
    case TokenBalanceType.GmxAccount:
      return t`GMX Account`;
    case TokenBalanceType.SourceChain: {
      const chainName = getChainName(source.chainId);
      return t`${chainName} wallet`;
    }
  }
}

export function getInsufficientFeeAction({
  tokenSymbol,
  feeSource,
}: {
  tokenSymbol: string;
  feeSource: NetworkFeeSource;
}): string {
  switch (feeSource.balanceType) {
    case TokenBalanceType.GmxAccount:
      return t`Deposit ${tokenSymbol}.`;
    case TokenBalanceType.Wallet:
    case TokenBalanceType.SourceChain:
      return t`Swap or bridge ${tokenSymbol}.`;
  }
}

export function getNetworkFeeSourceExplanation({
  source,
  isExpress,
  chainId,
}: {
  source: NetworkFeeSource;
  isExpress: boolean;
  chainId: ContractsChainId;
}): string {
  switch (source.balanceType) {
    case TokenBalanceType.Wallet: {
      if (isExpress) {
        return t`Express fees are paid in your Wallet gas payment token. Change it in Settings.`;
      }

      const nativeTokenSymbol = getNativeToken(chainId).symbol;
      return t`Wallet transactions pay gas in ${nativeTokenSymbol} from your Wallet.`;
    }
    case TokenBalanceType.GmxAccount:
      return t`This action is paid from your GMX Account, so its fee is paid in your GMX Account gas payment token. Change it in Settings.`;
    case TokenBalanceType.SourceChain: {
      const chainName = getChainName(source.chainId);
      const nativeTokenSymbol = getViemChain(source.chainId).nativeCurrency.symbol;
      return t`Bridge transactions pay gas in ${nativeTokenSymbol} from your ${chainName} wallet.`;
    }
  }
}
