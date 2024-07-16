import SyntheticsReader from "abis/SyntheticsReader.json";
import { getContract } from "config/contracts";
import { useMulticall } from "lib/multicall";
import { MarketInfo } from "../markets";
import { convertToContractPrice, parseContractPrice } from "../tokens";
import { formatDeltaUsd, formatUsd } from "lib/numbers";

export function useDebugExecutionPrice(
  chainId,
  p: {
    marketInfo?: MarketInfo;
    sizeInUsd?: bigint;
    sizeInTokens?: bigint;
    sizeDeltaUsd?: bigint;
    overrideIndexTokenPrice?: bigint;
    skip?: boolean;
    isLong?: boolean;
  }
) {
  const { marketInfo, sizeInUsd, sizeInTokens, sizeDeltaUsd, skip, isLong, overrideIndexTokenPrice } = p;

  const key =
    !skip &&
    marketInfo &&
    sizeInUsd !== undefined &&
    sizeInTokens !== undefined &&
    sizeDeltaUsd !== undefined &&
    isLong !== undefined
      ? [marketInfo.marketTokenAddress, sizeInUsd.toString(), sizeInTokens.toString(), sizeDeltaUsd.toString(), isLong]
      : null;

  useMulticall(chainId, "useExecutionPrice", {
    key,
    request: () => {
      const indexPrice = {
        min: convertToContractPrice(
          overrideIndexTokenPrice ?? marketInfo!.indexToken.prices.minPrice,
          marketInfo!.indexToken.decimals
        ),
        max: convertToContractPrice(
          overrideIndexTokenPrice ?? marketInfo!.indexToken.prices.maxPrice,
          marketInfo!.indexToken.decimals
        ),
      };

      return {
        reader: {
          contractAddress: getContract(chainId, "SyntheticsReader"),
          abi: SyntheticsReader.abi,
          calls: {
            executionPrice: {
              methodName: "getExecutionPrice",
              params: [
                getContract(chainId, "DataStore"),
                marketInfo!.marketTokenAddress,
                indexPrice,
                sizeInUsd,
                sizeInTokens,
                sizeDeltaUsd,
                isLong,
              ],
            },
          },
        },
      };
    },
    parseResponse: (res) => {
      const returnValues = res.data.reader.executionPrice.returnValues;

      // eslint-disable-next-line no-console
      console.log("useExecutionPrice", {
        executionPrice: formatUsd(
          parseContractPrice(BigInt(returnValues.executionPrice), marketInfo!.indexToken.decimals)
        ),
        priceImpactUsd: formatDeltaUsd(BigInt(returnValues.priceImpactUsd)),
        priceImpactDiffUsd: formatUsd(BigInt(returnValues.priceImpactDiffUsd)),
      });
    },
  });
}
