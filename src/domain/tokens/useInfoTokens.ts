import VaultReader from "abis/VaultReader.json";
import { getServerUrl } from "config/backend";
import { getContract } from "config/contracts";
import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { getV1Tokens, getWhitelistedV1Tokens } from "config/tokens";
import { Signer } from "ethers";
import { bigMath } from "lib/bigmath";
import { contractFetcher } from "lib/contracts";
import { DEFAULT_MAX_USDG_AMOUNT, MAX_PRICE_DEVIATION_BASIS_POINTS, USDG_ADDRESS, USD_DECIMALS } from "lib/legacy";
import { expandDecimals } from "lib/numbers";
import useSWR from "swr";
import { InfoTokens, Token, TokenInfo } from "./types";
import { getSpread } from "./utils";

export function useInfoTokens(
  signer: Signer | undefined,
  chainId: number,
  active: boolean,
  tokenBalances?: bigint[],
  fundingRateInfo?: bigint[],
  vaultPropsLength?: number
) {
  const tokens = getV1Tokens(chainId);
  const vaultReaderAddress = getContract(chainId, "VaultReader");
  const vaultAddress = getContract(chainId, "Vault");
  const positionRouterAddress = getContract(chainId, "PositionRouter");
  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");

  const whitelistedTokens = getWhitelistedV1Tokens(chainId);
  const whitelistedTokenAddresses = whitelistedTokens.map((token) => token.address);

  const { data: vaultTokenInfo } = useSWR<bigint[], any>(
    [`useInfoTokens:${active}`, chainId, vaultReaderAddress, "getVaultTokenInfoV4"],
    {
      fetcher: contractFetcher(signer, VaultReader, [
        vaultAddress,
        positionRouterAddress,
        nativeTokenAddress,
        expandDecimals(1, 18),
        whitelistedTokenAddresses,
      ]) as any,
    }
  );

  const indexPricesUrl = getServerUrl(chainId, "/prices");

  const { data: indexPrices } = useSWR(indexPricesUrl, {
    // @ts-ignore spread args incorrect type
    fetcher: (url) => fetch(url).then((res) => res.json()),
    refreshInterval: 500,
    refreshWhenHidden: true,
  });

  return {
    infoTokens: getInfoTokens(
      tokens,
      tokenBalances,
      whitelistedTokens,
      vaultTokenInfo,
      fundingRateInfo,
      vaultPropsLength,
      indexPrices,
      nativeTokenAddress
    ),
  };
}

function getInfoTokens(
  tokens: Token[],
  tokenBalances: bigint[] | undefined,
  whitelistedTokens: Token[],
  vaultTokenInfo: bigint[] | undefined,
  fundingRateInfo: bigint[] | undefined,
  vaultPropsLength: number | undefined,
  indexPrices: { [address: string]: bigint },
  nativeTokenAddress: string
): InfoTokens {
  if (!vaultPropsLength) {
    vaultPropsLength = 15;
  }
  const fundingRatePropsLength = 2;
  const infoTokens: InfoTokens = {};

  for (let i = 0; i < tokens.length; i++) {
    const token = JSON.parse(JSON.stringify(tokens[i])) as TokenInfo;

    if (tokenBalances) {
      token.balance = tokenBalances[i];
    }

    if (token.address === USDG_ADDRESS) {
      token.minPrice = expandDecimals(1, USD_DECIMALS);
      token.maxPrice = expandDecimals(1, USD_DECIMALS);
    }

    infoTokens[token.address] = token;
  }

  for (let i = 0; i < whitelistedTokens.length; i++) {
    const token = JSON.parse(JSON.stringify(whitelistedTokens[i])) as TokenInfo;

    if (vaultTokenInfo) {
      token.poolAmount = vaultTokenInfo[i * vaultPropsLength];
      token.reservedAmount = vaultTokenInfo[i * vaultPropsLength + 1];
      token.availableAmount = token.poolAmount - token.reservedAmount;
      token.usdgAmount = vaultTokenInfo[i * vaultPropsLength + 2];
      token.redemptionAmount = vaultTokenInfo[i * vaultPropsLength + 3];
      token.weight = vaultTokenInfo[i * vaultPropsLength + 4];
      token.bufferAmount = vaultTokenInfo[i * vaultPropsLength + 5];
      token.maxUsdgAmount = vaultTokenInfo[i * vaultPropsLength + 6];
      token.globalShortSize = vaultTokenInfo[i * vaultPropsLength + 7];
      token.maxGlobalShortSize = vaultTokenInfo[i * vaultPropsLength + 8];
      token.maxGlobalLongSize = vaultTokenInfo[i * vaultPropsLength + 9];
      token.minPrice = vaultTokenInfo[i * vaultPropsLength + 10];
      token.maxPrice = vaultTokenInfo[i * vaultPropsLength + 11];
      token.spread = getSpread({
        minPrice: token.minPrice,
        maxPrice: token.maxPrice,
      });
      token.guaranteedUsd = vaultTokenInfo[i * vaultPropsLength + 12];
      token.maxPrimaryPrice = vaultTokenInfo[i * vaultPropsLength + 13];
      token.minPrimaryPrice = vaultTokenInfo[i * vaultPropsLength + 14];

      // save minPrice and maxPrice as setTokenUsingIndexPrices may override it
      token.contractMinPrice = token.minPrice;
      token.contractMaxPrice = token.maxPrice;

      token.maxAvailableShort = 0n;

      token.hasMaxAvailableShort = false;
      if (token.maxGlobalShortSize > 0) {
        token.hasMaxAvailableShort = true;
        if (token.maxGlobalShortSize > token.globalShortSize) {
          token.maxAvailableShort = token.maxGlobalShortSize - token.globalShortSize;
        }
      }

      if (token.maxUsdgAmount == 0n) {
        token.maxUsdgAmount = DEFAULT_MAX_USDG_AMOUNT;
      }

      token.availableUsd = token.isStable
        ? bigMath.mulDiv(token.poolAmount, token.minPrice, expandDecimals(1, token.decimals))
        : bigMath.mulDiv(token.availableAmount, token.minPrice, expandDecimals(1, token.decimals));

      token.maxAvailableLong = 0n;
      token.hasMaxAvailableLong = false;
      if (token.maxGlobalLongSize > 0) {
        token.hasMaxAvailableLong = true;

        if (token.maxGlobalLongSize > token.guaranteedUsd) {
          const remainingLongSize = token.maxGlobalLongSize - token.guaranteedUsd;
          token.maxAvailableLong = remainingLongSize < token.availableUsd ? remainingLongSize : token.availableUsd;
        }
      } else {
        token.maxAvailableLong = token.availableUsd;
      }

      token.maxLongCapacity =
        token.maxGlobalLongSize > 0 && token.maxGlobalLongSize < token.availableUsd + token.guaranteedUsd
          ? token.maxGlobalLongSize
          : token.availableUsd + token.guaranteedUsd;

      token.managedUsd = token.availableUsd + token.guaranteedUsd;
      token.managedAmount = bigMath.mulDiv(token.managedUsd, expandDecimals(1, token.decimals), token.minPrice);

      setTokenUsingIndexPrices(token, indexPrices, nativeTokenAddress);
    }

    if (fundingRateInfo) {
      token.fundingRate = fundingRateInfo[i * fundingRatePropsLength];
      token.cumulativeFundingRate = fundingRateInfo[i * fundingRatePropsLength + 1];
    }

    if (infoTokens[token.address]) {
      token.balance = infoTokens[token.address].balance;
    }

    infoTokens[token.address] = token;
  }

  return infoTokens;
}

function setTokenUsingIndexPrices(
  token: TokenInfo,
  indexPrices: { [address: string]: bigint },
  nativeTokenAddress: string
) {
  if (!indexPrices) {
    return;
  }

  const tokenAddress = token.isNative ? nativeTokenAddress : token.address;

  const indexPrice = indexPrices[tokenAddress];

  if (indexPrice === undefined) {
    return;
  }

  const indexPriceBn = BigInt(indexPrice);

  if (indexPriceBn == 0n) {
    return;
  }

  const spread = token.maxPrice! - token.minPrice!;
  const spreadBps = bigMath.mulDiv(spread, BASIS_POINTS_DIVISOR_BIGINT, (token.maxPrice! + token.minPrice!) / 2n);

  if (spreadBps > MAX_PRICE_DEVIATION_BASIS_POINTS - 50) {
    // only set one of the values as there will be a spread between the index price and the Chainlink price
    if (indexPriceBn > token.minPrimaryPrice!) {
      token.maxPrice = indexPriceBn;
    } else {
      token.minPrice = indexPriceBn;
    }
    return;
  }

  const halfSpreadBps = spreadBps / 2n;
  token.maxPrice = bigMath.mulDiv(
    indexPriceBn,
    BASIS_POINTS_DIVISOR_BIGINT + halfSpreadBps,
    BASIS_POINTS_DIVISOR_BIGINT
  );
  token.minPrice = bigMath.mulDiv(
    indexPriceBn,
    BASIS_POINTS_DIVISOR_BIGINT - halfSpreadBps,
    BASIS_POINTS_DIVISOR_BIGINT
  );
}
