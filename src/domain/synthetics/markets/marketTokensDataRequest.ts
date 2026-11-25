import { getExplorerUrl } from "config/chains";
import { getContract } from "config/contracts";
import {
  MAX_PNL_FACTOR_FOR_DEPOSITS_KEY,
  MAX_PNL_FACTOR_FOR_WITHDRAWALS_KEY,
  multichainBalanceKey,
} from "config/dataStore";
import { USD_DECIMALS } from "config/factors";
import { getBalanceTypeFromSrcChainId, TokenData, TokensData } from "domain/synthetics/tokens";
import { ContractCallsConfig } from "lib/multicall";
import type { MulticallRequestConfig, MulticallResult } from "lib/multicall";
import { expandDecimals } from "lib/numbers";
import { getByKey } from "lib/objects";
import type { ContractsChainId, SourceChainId } from "sdk/configs/chains";
import { getTokenBySymbol } from "sdk/configs/tokens";

import { MarketsData } from "./types";
import { getContractMarketPrices } from "./utils";

export function buildMarketTokensDataRequest(
  chainId: ContractsChainId,
  p: {
    marketsAddresses: string[];
    marketsData: MarketsData | undefined;
    tokensData: TokensData;
    isDeposit: boolean;
    account: string | undefined;
  }
): MulticallRequestConfig {
  const { marketsAddresses, marketsData, tokensData, isDeposit, account } = p;

  return marketsAddresses.reduce<MulticallRequestConfig>((requests, marketAddress) => {
    const market = getByKey(marketsData, marketAddress)!;
    const marketPrices = getContractMarketPrices(tokensData, market);

    if (marketPrices) {
      const marketProps = {
        marketToken: market.marketTokenAddress,
        longToken: market.longTokenAddress,
        shortToken: market.shortTokenAddress,
        indexToken: market.indexTokenAddress,
      };

      const pnlFactorType = isDeposit ? MAX_PNL_FACTOR_FOR_DEPOSITS_KEY : MAX_PNL_FACTOR_FOR_WITHDRAWALS_KEY;

      requests[`${marketAddress}-prices`] = {
        contractAddress: getContract(chainId, "SyntheticsReader"),
        abiId: "SyntheticsReader",
        calls: {
          minPrice: {
            methodName: "getMarketTokenPrice",
            params: [
              getContract(chainId, "DataStore"),
              marketProps,
              marketPrices.indexTokenPrice,
              marketPrices.longTokenPrice,
              marketPrices.shortTokenPrice,
              pnlFactorType,
              false,
            ],
          },
          maxPrice: {
            methodName: "getMarketTokenPrice",
            params: [
              getContract(chainId, "DataStore"),
              marketProps,
              marketPrices.indexTokenPrice,
              marketPrices.longTokenPrice,
              marketPrices.shortTokenPrice,
              pnlFactorType,
              true,
            ],
          },
        },
      } satisfies ContractCallsConfig<any>;
    }

    requests[`${marketAddress}-tokenData`] = {
      contractAddress: marketAddress,
      abiId: "Token",
      calls: {
        totalSupply: {
          methodName: "totalSupply",
          params: [],
        },
        balance: account
          ? {
              methodName: "balanceOf",
              params: [account],
            }
          : undefined,
      },
    } satisfies ContractCallsConfig<any>;

    if (account) {
      requests[`${marketAddress}-gmxAccountData`] = {
        contractAddress: getContract(chainId, "DataStore"),
        abiId: "DataStore",
        calls: {
          balance: {
            methodName: "getUint",
            params: [multichainBalanceKey(account, marketAddress)],
          },
        },
      } satisfies ContractCallsConfig<any>;
    }

    return requests;
  }, {});
}

export function parseMarketTokenData(
  res: MulticallResult<any>,
  p: {
    chainId: ContractsChainId;
    srcChainId: SourceChainId | undefined;
    account: string | undefined;
    marketAddress: string;
  }
): TokenData | undefined {
  const { chainId, srcChainId, account, marketAddress } = p;
  const pricesErrors = res.errors[`${marketAddress}-prices`];
  const tokenDataErrors = res.errors[`${marketAddress}-tokenData`];

  const pricesData = res.data[`${marketAddress}-prices`];
  const tokenData = res.data[`${marketAddress}-tokenData`];
  const gmxAccountData = res.data[`${marketAddress}-gmxAccountData`];

  if (pricesErrors || tokenDataErrors || !pricesData || !tokenData) {
    return undefined;
  }

  const tokenConfig = getTokenBySymbol(chainId, "GM");

  const minPrice = BigInt(pricesData?.minPrice.returnValues[0]);
  const maxPrice = BigInt(pricesData?.maxPrice.returnValues[0]);

  const walletBalance =
    account && tokenData.balance?.returnValues ? BigInt(tokenData?.balance?.returnValues[0]) : undefined;
  const gmxAccountBalance =
    account && gmxAccountData?.balance?.returnValues ? BigInt(gmxAccountData?.balance?.returnValues[0]) : undefined;

  const balance = srcChainId !== undefined ? gmxAccountBalance : walletBalance;

  return {
    ...tokenConfig,
    address: marketAddress,
    prices: {
      minPrice: minPrice !== undefined && minPrice > 0 ? minPrice : expandDecimals(1, USD_DECIMALS),
      maxPrice: maxPrice !== undefined && maxPrice > 0 ? maxPrice : expandDecimals(1, USD_DECIMALS),
    },
    totalSupply: BigInt(tokenData?.totalSupply.returnValues[0]),
    walletBalance,
    gmxAccountBalance,
    balanceType: getBalanceTypeFromSrcChainId(srcChainId),
    balance,
    explorerUrl: `${getExplorerUrl(chainId)}/token/${marketAddress}`,
  };
}
