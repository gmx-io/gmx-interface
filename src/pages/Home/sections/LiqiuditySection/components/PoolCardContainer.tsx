import { t } from "@lingui/macro";

import { useGoToPools } from "pages/Home/hooks/useGoToPools";

import glvCoin from "img/bg_coin_glv.png";
import gmCoin from "img/bg_coin_gm.png";
import gmxCoin from "img/bg_coin_gmx.png";
import IcGlvPool from "img/ic_glv_pool.svg?react";
import IcGmPool from "img/ic_gm_pool.svg?react";
import IcGmxPool from "img/ic_gmx_pool.svg?react";

import { PoolCard } from "./PoolCard";

type Pool = "GM" | "GLV" | "GMX";

type Props = {
  pool: Pool;
};

const DESCRIPTIONS: Record<Pool, string> = {
  GMX: t`Stake for rewards and governance rights`,
  GLV: t`Steady returns without management`,
  GM: t`Invest with control over risk and reward`,
};

const ICONS: Record<Pool, React.FunctionComponent<React.SVGProps<SVGSVGElement> & { title?: string }>> = {
  GMX: IcGmxPool,
  GLV: IcGlvPool,
  GM: IcGmPool,
};

const NAMES: Record<Pool, string> = {
  GMX: "GMX",
  GLV: "GLV",
  GM: "GM",
};

const COIN_IMAGES: Record<Pool, string> = {
  GMX: gmxCoin,
  GLV: glvCoin,
  GM: gmCoin,
};

export function PoolCardContainer({ pool }: Props) {
  const onClick = useGoToPools({ pool });
  //TODO: get apr from api
  return (
    <PoolCard
      name={NAMES[pool]}
      apr={10}
      description={DESCRIPTIONS[pool]}
      iconComponent={ICONS[pool]}
      coinImage={COIN_IMAGES[pool]}
      onClick={onClick}
    />
  );
}
