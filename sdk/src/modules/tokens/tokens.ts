import { getContract } from "configs/contracts";
import { NATIVE_TOKEN_ADDRESS, getToken, getTokensMap, getV2Tokens, getWrappedToken } from "configs/tokens";
import { Token, TokenBalancesData, TokenPricesData, TokensData, Token as TToken } from "types/tokens";
import type { ContractCallsConfig } from "utils/multicall";
import { parseContractPrice } from "utils/tokens";

import { Module } from "../base";

type TokenPricesDataResult = {
  pricesData?: TokenPricesData;
  updatedAt?: number;
};

type TokensDataResult = {
  tokensData?: TokensData;
  pricesUpdatedAt?: number;
};

export class Tokens extends Module {
  _tokensConfigs: { [key: string]: TToken } | undefined = undefined;
  get tokensConfig() {
    if (this._tokensConfigs) {
      return this._tokensConfigs;
    }

    const tokenConfigs = this._tokensConfigs ?? getTokensMap(this.chainId);

    Object.entries(this.sdk.config.tokens ?? []).forEach(([address, token]) => {
      tokenConfigs[address] = {
        ...tokenConfigs[address],
        ...token,
      };
    });

    this._tokensConfigs = tokenConfigs;

    return tokenConfigs;
  }

  private getTokenRecentPrices(): Promise<TokenPricesDataResult> {
    return this.oracle.getTickers().then((priceItems) => {
      const result: TokenPricesData = {};

      priceItems.forEach((priceItem) => {
        let tokenConfig: any;

        try {
          tokenConfig = getToken(this.chainId, priceItem.tokenAddress);
        } catch (e) {
          // ignore unknown token errors

          return;
        }

        result[tokenConfig.address] = {
          minPrice: parseContractPrice(BigInt(priceItem.minPrice), tokenConfig.decimals),
          maxPrice: parseContractPrice(BigInt(priceItem.maxPrice), tokenConfig.decimals),
        };
      });

      const wrappedToken = getWrappedToken(this.chainId);

      if (result[wrappedToken.address] && !result[NATIVE_TOKEN_ADDRESS]) {
        result[NATIVE_TOKEN_ADDRESS] = result[wrappedToken.address];
      }

      return {
        pricesData: result,
        updatedAt: Date.now(),
      };
    });
  }

  private getTokensBalances(
    account?: string,
    tokensList?: {
      address: string;
      isSynthetic?: boolean;
    }[]
  ) {
    account = account || this.sdk.config.account;
    tokensList = tokensList || getV2Tokens(this.chainId);

    return this.sdk
      .executeMulticall(
        tokensList.reduce(
          (acc, token) => {
            // Skip synthetic tokens
            if (token.isSynthetic) return acc;

            const address = token.address;

            if (address === NATIVE_TOKEN_ADDRESS) {
              acc[address] = {
                contractAddress: getContract(this.chainId, "Multicall"),
                abiId: "Multicall",
                calls: {
                  balance: {
                    methodName: "getEthBalance",
                    params: [account],
                  },
                },
              } satisfies ContractCallsConfig<any>;
            } else {
              acc[address] = {
                contractAddress: address,
                abiId: "Token",
                calls: {
                  balance: {
                    methodName: "balanceOf",
                    params: [account],
                  },
                },
              } satisfies ContractCallsConfig<any>;
            }

            return acc;
          },
          {} as Record<string, ContractCallsConfig<any>>
        )
      )
      .then((res) => {
        return Object.keys(res.data).reduce((tokenBalances: TokenBalancesData, tokenAddress) => {
          tokenBalances[tokenAddress] = res.data[tokenAddress].balance.returnValues[0];

          return tokenBalances;
        }, {} as TokenBalancesData);
      });
  }

  getNativeToken(): TToken {
    return this.tokensConfig[NATIVE_TOKEN_ADDRESS];
  }

  async getTokensData(): Promise<TokensDataResult> {
    const tokenConfigs = this.tokensConfig;

    const [apiTokens, { pricesData, updatedAt: pricesUpdatedAt }] = await Promise.all([
      this.sdk.oracle.getTokens(),
      this.getTokenRecentPrices(),
    ]);

    const nativeToken = this.getNativeToken();
    const tokens = [nativeToken, ...apiTokens];

    const balancesData = this.account ? await this.getTokensBalances(this.account, tokens) : ({} as TokenBalancesData);

    if (!pricesData) {
      return {
        tokensData: undefined,
        pricesUpdatedAt: undefined,
      };
    }

    return {
      tokensData: tokens.reduce((acc: TokensData, token) => {
        const tokenAddress = token.address;
        const prices = pricesData[tokenAddress];
        const balance = balancesData?.[tokenAddress];
        const tokenConfig = tokenConfigs[tokenAddress];

        if (!prices) {
          return acc;
        }

        acc[tokenAddress] = {
          ...token,
          ...tokenConfig,
          prices,
          balance,
        };
        return acc;
      }, {} as TokensData),
      pricesUpdatedAt,
    };
  }
}
