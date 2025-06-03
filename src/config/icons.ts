import {
  ARBITRUM,
  ARBITRUM_SEPOLIA,
  AVALANCHE,
  AVALANCHE_FUJI,
  OPTIMISM_SEPOLIA,
  SEPOLIA,
  UiSupportedChain,
} from "config/chains";

import gmIcon from "img/gm_icon.svg";
import arbitrum from "img/ic_arbitrum_24.svg";
import arbitrumSepolia from "img/ic_arbitrum_sepolia_24.svg";
import avalanche from "img/ic_avalanche_24.svg";
import avalancheTestnet from "img/ic_avalanche_testnet_24.svg";
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
import optimismSepolia from "img/ic_op_24.svg";
import sepolia from "img/ic_sepolia_24.svg";

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
  [ARBITRUM_SEPOLIA]: {
    network: arbitrumSepolia,
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
  common: {
    gmx: gmxIcon,
    gmxOutline: gmxOutlineIcon,
    glp: glpIcon,
    esgmx: esGMXIcon,
    gm: gmIcon,
    glv: glvIcon,
  },
};

export const CHAIN_ID_TO_NETWORK_ICON: Record<UiSupportedChain | 0, string> = {
  [ARBITRUM]: arbitrum,
  [AVALANCHE]: avalanche,
  0: gmxIcon,
  // [BASE_MAINNET]: baseIcon,
  // [SONIC_MAINNET]: sonicIcon,

  [AVALANCHE_FUJI]: avalancheTestnet,
  [ARBITRUM_SEPOLIA]: arbitrumSepolia,
  [OPTIMISM_SEPOLIA]: optimismSepolia,
  [SEPOLIA]: sepolia,
};

export function getIcon(chainId: number | "common", label: keyof ChainIcons) {
  if (!chainId || !(chainId in ICONS)) {
    throw new Error(`No icons found for chain: ${chainId}`);
  }

  return ICONS[chainId][label];
}

export function getChainIcon(chainId: number) {
  if (!(chainId in CHAIN_ID_TO_NETWORK_ICON)) {
    throw new Error(`No icon found for chain: ${chainId}`);
  }

  return CHAIN_ID_TO_NETWORK_ICON[chainId];
}

export function getIcons(chainId: number | "common") {
  if (!chainId || !(chainId in ICONS)) {
    throw new Error(`No icons found for chain: ${chainId}`);
  }

  return ICONS[chainId];
}
