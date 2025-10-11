import { ContractsChainId, ARBITRUM } from "./chains";

export type VenusVTokenConfig = {
  vTokenAddress: string;
  underlyingAddress: string;
  symbol: string;
};

export type VenusDeployment = {
  comptroller: string;
  poolRegistry: string;
  poolLens: string;
  nativeTokenGateway: string;
  vTokens: VenusVTokenConfig[];
};

export const VENUS_EXCHANGE_RATE_DECIMALS = 18n;

const VENUS_DEPLOYMENTS: Partial<Record<ContractsChainId, VenusDeployment>> = {
  [ARBITRUM]: {
    comptroller: "0x317c1A5739F39046E20b08ac9BeEa3f10fD43326",
    poolRegistry: "0x382238f07Bc4Fe4aA99e561adE8A4164b5f815DA",
    poolLens: "0x53F34FF95367B2A4542461a6A63fD321F8da22AD",
    nativeTokenGateway: "0xc8e51418cadc001157506b306C6d0b878f1ff755",
    vTokens: [
      {
        vTokenAddress: "0xAeB0FEd69354f34831fe1D16475D9A83ddaCaDA6",
        underlyingAddress: "0x912ce59144191c1204e64559fe8253a0e49e6548",
        symbol: "vARB_Core",
      },
      {
        vTokenAddress: "0x4f3a73f318C5EA67A86eaaCE24309F29f89900dF",
        underlyingAddress: "0x47c031236e19d024b42f8AE6780E44A573170703",
        symbol: "vgmBTC-USDC_Core",
      },
      {
        vTokenAddress: "0x9bb8cEc9C0d46F53b4f2173BB2A0221F66c353cC",
        underlyingAddress: "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336",
        symbol: "vgmWETH-USDC_Core",
      },
      {
        vTokenAddress: "0x7D8609f8da70fF9027E9bc5229Af4F6727662707",
        underlyingAddress: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
        symbol: "vUSDC_Core",
      },
      {
        vTokenAddress: "0xB9F9117d4200dC296F9AcD1e8bE1937df834a2fD",
        underlyingAddress: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
        symbol: "vUSDT_Core",
      },
      {
        vTokenAddress: "0xaDa57840B372D4c28623E87FC175dE8490792811",
        underlyingAddress: "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f",
        symbol: "vWBTC_Core",
      },
      {
        vTokenAddress: "0x68a34332983f4Bf866768DD6D6E638b02eF5e1f0",
        underlyingAddress: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        symbol: "vWETH_Core",
      },
    ],
  },
};

export function getVenusDeployment(chainId: ContractsChainId): VenusDeployment | undefined {
  return VENUS_DEPLOYMENTS[chainId];
}

export function hasVenusDeployment(chainId: ContractsChainId): boolean {
  return Boolean(getVenusDeployment(chainId));
}
