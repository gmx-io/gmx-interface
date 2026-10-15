import { t } from "@lingui/macro";

import { ContractsChainId } from "config/chains";
import { getIsGlv } from "config/markets";
import {
  GLP_DISTRIBUTION_ID,
  GLV_BONUS_INCENTIVE_DISTRIBUTION_TEST_ID,
  GLV_BONUS_INCENTIVE_DISTRIBUTION_ID,
  GLP_DISTRIBUTION_TEST_ID,
} from "domain/synthetics/claims/constants";
import type { UserIncentiveDistribution as UserIncentiveDistributionData } from "domain/synthetics/common/useUserIncentiveData";
import { MarketsData } from "domain/synthetics/markets";
import { TokensData } from "domain/synthetics/tokens";
import { Token } from "domain/tokens";
import { GM_DECIMALS } from "lib/legacy";
import { expandDecimals } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";

export const getDistributionTitle = (distributionId: string) => {
  switch (distributionId) {
    case GLP_DISTRIBUTION_TEST_ID.toString():
      return t`GLP reimbursement (test)`;
    case GLP_DISTRIBUTION_ID.toString():
      return t`GLP reimbursement`;
    case GLV_BONUS_INCENTIVE_DISTRIBUTION_ID.toString():
      return t`GLV bonus incentive`;
    case GLV_BONUS_INCENTIVE_DISTRIBUTION_TEST_ID.toString():
      return t`GLV bonus incentive (test)`;
  }
};

export function getNormalizedIncentive(
  chainId: ContractsChainId,
  incentive: UserIncentiveDistributionData,
  tokens: Token[],
  gmMarkets: MarketsData | undefined,
  marketTokensData: TokensData | undefined
) {
  const tokenIncentiveDetails = incentive.tokens.map((tokenAddressRaw, index) => {
    // backend should send tokenAddress in lowercase but we double-check here to not break the logic
    const tokenAddress = tokenAddressRaw.toLowerCase();
    const marketTokenKey = gmMarkets ? Object.keys(gmMarkets).find((key) => key.toLowerCase() === tokenAddress) : null;
    const marketToken = marketTokenKey ? gmMarkets?.[marketTokenKey] : undefined;
    const tokenInfo = marketToken ? undefined : tokens.find((token) => token.address.toLowerCase() === tokenAddress);
    const amountInUsd =
      marketTokensData && marketToken
        ? bigMath.mulDiv(
            BigInt(incentive.amounts[index]),
            marketTokensData[marketToken.marketTokenAddress].prices.maxPrice,
            expandDecimals(1, GM_DECIMALS)
          )
        : BigInt(incentive.amountsInUsd?.[index] ?? 0);

    let symbol: string | undefined;
    let iconSymbol: string | undefined;
    if (tokenInfo) {
      symbol = tokenInfo.symbol;
      iconSymbol = tokenInfo.symbol;
    } else if (marketToken) {
      // market names like "AVAX/USD [WAVAX-WAVAX]" have no icon file
      symbol = marketToken.name;
      iconSymbol = "GM";
    } else if (getIsGlv(chainId, tokenAddress)) {
      symbol = "GLV";
      iconSymbol = "GLV";
    }

    return {
      symbol,
      iconSymbol,
      decimals: tokenInfo ? tokenInfo.decimals : GM_DECIMALS,
      amount: BigInt(incentive.amounts[index]),
      amountInUsd,
      id: `${incentive.id}-${tokenAddress}`,
    };
  });

  const totalUsd = tokenIncentiveDetails.reduce((total, tokenInfo) => total + tokenInfo.amountInUsd, 0n);

  return {
    ...incentive,
    tokenIncentiveDetails,
    totalUsd,
    typeId: BigInt(incentive.typeId),
  };
}
