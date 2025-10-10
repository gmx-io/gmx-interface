import { ARBITRUM, ContractsChainId } from "./chains";

export type UniswapV3Deployment = {
  positionManager: string;
  factory: string;
};

const DEPLOYMENTS: Partial<Record<ContractsChainId, UniswapV3Deployment>> = {
  [ARBITRUM]: {
    positionManager: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
  },
};

export function getUniswapV3Deployment(chainId: ContractsChainId): UniswapV3Deployment | undefined {
  return DEPLOYMENTS[chainId];
}

export function hasUniswapV3Deployment(chainId: ContractsChainId): boolean {
  return Boolean(getUniswapV3Deployment(chainId));
}
