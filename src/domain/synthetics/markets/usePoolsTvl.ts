import { ARBITRUM } from "config/chains";
import { useGmxPrice } from "domain/legacy";
import useV2Stats from "domain/synthetics/stats/useV2Stats";
import { GMX_DECIMALS } from "lib/legacy";
import { expandDecimals } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";
import { bigMath } from "sdk/utils/bigmath";

import { useGmxStaked } from "../../stats/useGmxStacked";

export function usePoolsTvl({ chainId }: { chainId: number }) {
  const { active, signer } = useWallet();
  const v2Stats = useV2Stats(chainId);
  const stakedGmx = useGmxStaked(chainId);
  const { gmxPrice } = useGmxPrice(chainId, { arbitrum: chainId === ARBITRUM ? signer : undefined }, active);

  const gmTvl = v2Stats?.totalGMLiquidity;

  if (gmxPrice !== undefined && stakedGmx !== undefined) {
    const stakedGmxUsd = bigMath.mulDiv(gmxPrice, stakedGmx, expandDecimals(1, GMX_DECIMALS));

    // GMX Staked + GM Pools
    return stakedGmxUsd + gmTvl;
  }

  return undefined;
}
