import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI, BOTANIX } from "config/chains";

import gmIcon from "img/gm_icon.svg";
import arbitrum from "img/ic_arbitrum_24.svg";
import avalanche from "img/ic_avalanche_24.svg";
import avalancheTestnet from "img/ic_avalanche_testnet_24.svg";
import botanix from "img/ic_botanix_40.svg";
import esGMXIcon from "img/ic_esgmx_40.svg";
import esGMXArbitrumIcon from "img/ic_esgmx_arbitrum.svg";
import esGMXAvaxIcon from "img/ic_esgmx_avalanche.svg";
import glpIcon from "img/ic_glp_40.svg";
import glpArbitrum from "img/ic_glp_arbitrum.svg";
import glpAvax from "img/ic_glp_avalanche.svg";
import glvIcon from "img/ic_glv_40.svg";
import gmArbitrum from "img/ic_gm_arbitrum.svg";
import gmAvax from "img/ic_gm_avax.svg";
import gmxIcon from "img/ic_gmx_40.svg";
import gmxArbitrum from "img/ic_gmx_arbitrum.svg";
import gmxAvax from "img/ic_gmx_avax.svg";
import gmxOutlineIcon from "img/ic_gmxv1flat.svg";

type ChainIcons = {
  network?: string;
  gmx: string;
  glp: string;
  esgmx?: string;
  gm: string;
  gmxOutline?: string;
  glv?: string;
};

const ICONS: Record<number | "common", ChainIcons> = {
  [ARBITRUM]: {
    network: arbitrum,
    gmx: gmxArbitrum,
    glp: glpArbitrum,
    esgmx: esGMXArbitrumIcon,
    gm: gmArbitrum,
  },
  [AVALANCHE]: {
    network: avalanche,
    gmx: gmxAvax,
    glp: glpAvax,
    esgmx: esGMXAvaxIcon,
    gm: gmAvax,
  },
  [AVALANCHE_FUJI]: {
    network: avalancheTestnet,
    gm: gmAvax,
    gmx: gmxAvax,
    glp: glpAvax,
  },
  [BOTANIX]: {
    network: botanix,
    glp: glpIcon,
    gmx: gmxIcon,
    gm: gmIcon,
    esgmx: esGMXIcon,
  },
  common: {
    gmx: gmxIcon,
    gmxOutline: gmxOutlineIcon,
    glp: glpIcon,
    esgmx: esGMXIcon,
    gm: gmIcon,
    glv: glvIcon,
  },
};

export function getIcon(chainId: number | "common", label: keyof ChainIcons) {
  if (!chainId || !(chainId in ICONS)) {
    throw new Error(`No icons found for chain: ${chainId}`);
  }

  return ICONS[chainId][label];
}
export function getIcons(chainId: number | "common") {
  if (!chainId || !(chainId in ICONS)) {
    throw new Error(`No icons found for chain: ${chainId}`);
  }

  return ICONS[chainId];
}
