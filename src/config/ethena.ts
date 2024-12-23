export const ETHENA_DASHBOARD_URL = "https://app.ethena.fi/join";

export const isEthenaSatsIncentivizedMarket = function (marketAddress: string) {
  return [
    "0x0Cf1fb4d1FF67A3D8Ca92c9d6643F8F9be8e03E5", // ETH/USD [wstETH-USDe]
  ].includes(marketAddress);
};
