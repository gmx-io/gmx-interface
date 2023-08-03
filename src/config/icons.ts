// eslint-disable-next-line
import { ARBITRUM, ARBITRUM_TESTNET, AVALANCHE, AVALANCHE_FUJI, OPTIMISM_GOERLI_TESTNET, SEPOLIA_TESTNET } from "config/chains";
import arbitrum from "img/ic_arbitrum_24.svg";
import avalanche from "img/ic_avalanche_24.svg";
import avalancheTestnet from "img/ic_avalanche_testnet_24.svg";
import sepoliaTesnet from "img/ic_sepolia_testnet_24.svg";

import gmxIcon from "img/ic_gmx_40.svg";
import glpIcon from "img/ic_glp_40.svg";
import tlpIcon from "img/ic_glp_sepolia.svg";
import gmxArbitrum from "img/ic_gmx_arbitrum.svg";
import gmxAvax from "img/ic_gmx_avax.svg";
import glpArbitrum from "img/ic_glp_arbitrum.svg";
import glpAvax from "img/ic_glp_avax.svg";
import optimismIcn from "img/icn_opt_24.svg"

const ICONS = {
  [ARBITRUM]: {
    network: arbitrum,
    gmx: gmxArbitrum,
    glp: glpArbitrum,
  },
  [AVALANCHE]: {
    network: avalanche,
    gmx: gmxAvax,
    glp: glpAvax,
  },
  [ARBITRUM_TESTNET]: {
    network: arbitrum,
  },
  [AVALANCHE_FUJI]: {
    network: avalancheTestnet,
  },
  [SEPOLIA_TESTNET]: {
    network: sepoliaTesnet,
    glp: tlpIcon,
  },
  [OPTIMISM_GOERLI_TESTNET]: {
    network: optimismIcn,
    glp: tlpIcon,
  },
  common: {
    gmx: gmxIcon,
    glp: glpIcon,
  },
};

export function getIcon(chainId: number | "common", label: string) {
  if (chainId in ICONS) {
    if (label in ICONS[chainId]) {
      return ICONS[chainId][label];
    }
  }
}
export function getIcons(chainId: number | "common") {
  if (!chainId) return;
  if (chainId in ICONS) {
    return ICONS[chainId];
  }
}
