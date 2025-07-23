import { t } from "@lingui/macro";

import glvCoin from "img/bg_coin_glv.png";
import gmCoin from "img/bg_coin_gm.png";
import gmxCoin from "img/bg_coin_gmx.png";
import IcGlvPool from "img/ic_glv_pool.svg?react";
import IcGmPool from "img/ic_gm_pool.svg?react";
import IcGmxPool from "img/ic_gmx_pool.svg?react";

import { PoolCard } from "./PoolCard";
import { useGoToPools } from "../hooks/useGoToPools";

export function PoolCards() {
  const onClickGmx = useGoToPools("GMX");
  const onClickGlv = useGoToPools("GLV");
  const onClickGm = useGoToPools("GM");
  //TODO: get apr from api
  return (
    <>
      <PoolCard
        name="GMX"
        apr={10}
        description={t`Stake for rewards and governance rights`}
        iconComponent={IcGmxPool}
        coinImage={gmxCoin}
        onClick={onClickGmx}
      />
      <PoolCard
        name="GLV"
        apr={10}
        description={t`Steady returns without management`}
        iconComponent={IcGlvPool}
        coinImage={glvCoin}
        onClick={onClickGlv}
      />
      <PoolCard
        name="GM"
        apr={10}
        description={t`Invest with control over risk and reward`}
        iconComponent={IcGmPool}
        coinImage={gmCoin}
        onClick={onClickGm}
      />
    </>
  );
}
