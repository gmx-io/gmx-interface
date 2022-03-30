import React, { useEffect } from "react";
import UniPool from "../../abis/UniPool.json";
import { useWeb3React } from "@web3-react/core";
import useSWR from "swr";
import { fetcher, useChainId } from "../../Helpers";

export default function Debug() {
  const { active, library } = useWeb3React();
  const { chainId } = useChainId();

  // const poolAddress = "0x80A9ae39310abf666A87C743d6ebBD0E8C42158E" // GMX/WETH
  const poolAddress = "0x5ab703d58b73475cd83ce2dbada8f2e6c977e7ed"; // GM/USD

  const { data: uniPoolSlot0, mutate: updateUniPoolSlot0 } = useSWR(
    [`Debug:uniPoolSlot0:${active}`, chainId, poolAddress, "slot0"],
    {
      fetcher: fetcher(library, UniPool),
    }
  );

  const { data: uniPoolTickSpacing, mutate: updateUniPoolTickSpacing } = useSWR(
    [`Debug:uniPoolTickSpacing:${active}`, chainId, poolAddress, "tickSpacing"],
    {
      fetcher: fetcher(library, UniPool),
    }
  );

  useEffect(() => {
    if (active) {
      library.on("block", () => {
        updateUniPoolSlot0(undefined, true);
        updateUniPoolTickSpacing(undefined, true);
      });
      return () => {
        library.removeAllListeners("block");
      };
    }
  }, [library, active, updateUniPoolSlot0, updateUniPoolTickSpacing]);

  if (uniPoolSlot0) {
    console.info("tick", uniPoolSlot0.tick.toString());
  }

  if (uniPoolTickSpacing) {
    console.info("tickSpacing", uniPoolTickSpacing.toString());
  }

  return <div className="Debug"></div>;
}
