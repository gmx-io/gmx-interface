
import SyntheticsReader from "abis/SyntheticsReader.json";
import { getContract } from "config/contracts";
import { BigNumber, ethers } from "ethers";
import { PositionsData, getPositionKey } from "../positions";
import { ContractMarketPrices } from "../markets";
import useSWR from "swr";
import { useWeb3React } from "@web3-react/core";

type PositionsResult = {
  isLoading: boolean;
  data: PositionsData;
  error: Error | null;
};

const parsePositionsInfo = (positionKeys: string[], positions: { [key: string]: any, [key: number]: any }[]) => (
  positions.reduce((positionsMap: PositionsData, positionInfo, i) => {
    const { position, fees } = positionInfo;
    const { addresses, numbers, flags, data } = position;
    const { account, market: marketAddress, collateralToken: collateralTokenAddress } = addresses;

    // Empty position
    if (BigNumber.from(numbers.increasedAtBlock).eq(0)) {
      return positionsMap;
    }

    const positionKey = getPositionKey(account, marketAddress, collateralTokenAddress, flags.isLong);
    const contractPositionKey = positionKeys[i];

    positionsMap[positionKey] = {
      key: positionKey,
      contractKey: contractPositionKey,
      account,
      marketAddress,
      collateralTokenAddress,
      sizeInUsd: BigNumber.from(numbers.sizeInUsd),
      sizeInTokens: BigNumber.from(numbers.sizeInTokens),
      collateralAmount: BigNumber.from(numbers.collateralAmount),
      increasedAtBlock: BigNumber.from(numbers.increasedAtBlock),
      decreasedAtBlock: BigNumber.from(numbers.decreasedAtBlock),
      isLong: flags.isLong,
      pendingBorrowingFeesUsd: BigNumber.from(fees.borrowing.borrowingFeeUsd),
      fundingFeeAmount: BigNumber.from(fees.funding.fundingFeeAmount),
      claimableLongTokenAmount: BigNumber.from(fees.funding.claimableLongTokenAmount),
      claimableShortTokenAmount: BigNumber.from(fees.funding.claimableShortTokenAmount),
      data,
    };

    return positionsMap;
  },
  {} as PositionsData
));

export function usePositionsInfo(
  chainId: number,
  positionKeys: string[],
  marketPrices: ContractMarketPrices[],
): PositionsResult {
  const { library } = useWeb3React();
  const keys = [...positionKeys].sort((a, b) => a < b ? -1 : 1).join("-");
  const method = "getAccountPositionInfoList";
  const contractName = "SyntheticsReader";
  const { data, error } = useSWR<PositionsData>([
    chainId,
    contractName,
    method,
    keys
  ], async () => {
    if (!positionKeys.length) {
      return {};
    }
    if (positionKeys.length !== marketPrices.length) {
      throw new Error("The numbers of market prices and position keys do not match");
    }

    const contract = new ethers.Contract(
      getContract(chainId, contractName),
      SyntheticsReader.abi,
      library.getSigner()
    );

    const args = [
      getContract(chainId, "DataStore"),
      getContract(chainId, "ReferralStorage"),
      positionKeys,
      marketPrices,
      ethers.constants.AddressZero, // uiFeeReceiver
    ];

    return parsePositionsInfo(positionKeys, await contract[method](...args)) as PositionsData ;
  });

  return { isLoading: !data, data: data || {}, error: error || null };
}
