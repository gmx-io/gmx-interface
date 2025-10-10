import { t } from "@lingui/macro";
import { useHomePageContext } from "landing/pages/Home/contexts/HomePageContext";

import { useStakingProcessedData } from "domain/stake/useStakingProcessedData";
import { bigintToNumber } from "lib/numbers";
import { ARBITRUM } from "sdk/configs/chainIds";

import glvCoin from "img/bg_coin_glv.png";
import gmCoin from "img/bg_coin_gm.png";
import gmxCoin from "img/bg_coin_gmx.png";
import IcGlvPool from "img/ic_glv_pool.svg?react";
import IcGmPool from "img/ic_gm_pool.svg?react";
import IcGmxPool from "img/ic_gmx_pool.svg?react";

import { PoolCard } from "./PoolCard";
import { useGoToPools } from "../hooks/useGoToPools";

const DECIMALS = 4;

export function PoolCards() {
  const onClickGmx = useGoToPools("GMX");
  const onClickGlv = useGoToPools("GLV");
  const onClickGm = useGoToPools("GM");
  const { poolsData } = useHomePageContext();
  const processedData = useStakingProcessedData(ARBITRUM);
  const gmxAprForGmxPercentage = processedData?.data?.gmxAprForGmx
    ? bigintToNumber(processedData.data.gmxAprForGmx, DECIMALS)
    : undefined;
  return (
    <>
      <PoolCard
        name="GMX"
        apr={gmxAprForGmxPercentage}
        description={t`Stake for rewards and governance rights`}
        iconComponent={IcGmxPool}
        coinImage={gmxCoin}
        onClick={onClickGmx}
      />
      <PoolCard
        name="GLV"
        apr={poolsData?.glvApy}
        description={t`Steady returns without management`}
        iconComponent={IcGlvPool}
        coinImage={glvCoin}
        onClick={onClickGlv}
      />
      <PoolCard
        name="GM"
        apr={poolsData?.gmApy}
        description={t`Invest with control over risk and reward`}
        iconComponent={IcGmPool}
        coinImage={gmCoin}
        onClick={onClickGm}
      />
    </>
  );
}
