import React from "react";

import { AVALANCHE, getConstant } from "config/chains";

import StakeV1 from "./StakeV1";
import StakeV2 from "./StakeV2";
import { OptInV2ContextProvider } from "pages/Dashboard/opt-in/OptInV2ContextProvider";

export default function Stake(props) {
  const chainId = AVALANCHE;
  const isV2 = getConstant(chainId, "v2");
  return isV2 ? (
    <OptInV2ContextProvider
      withTokenBalancesWithSupplies
      withDepositBalances
      withStakingInfo
      withGmxStakedBalance
      withAums
      withNativeTokenMinPrice
      withEsGmxSupply
      withGmxPrice
      withSecondaryGmxPrices
    >
      <StakeV2 {...props} />
    </OptInV2ContextProvider>
  ) : (
    <StakeV1 {...props} />
  );
}
