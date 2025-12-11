import {
  AnyChainId,
  ARBITRUM,
  ARBITRUM_SEPOLIA,
  AVALANCHE,
  AVALANCHE_FUJI,
  BOTANIX,
  GMX_ACCOUNT_PSEUDO_CHAIN_ID,
  GmxAccountPseudoChainId,
  SOURCE_BASE_MAINNET,
  SOURCE_BSC_MAINNET,
  SOURCE_ETHEREUM_MAINNET,
  SOURCE_OPTIMISM_SEPOLIA,
  SOURCE_SEPOLIA,
} from "config/chains";

import gmIcon from "img/gm_icon.svg";
import bsc from "img/ic_bsc.svg";
import esGMXArbitrumIcon from "img/ic_esgmx_arbitrum.svg";
import esGMXAvaxIcon from "img/ic_esgmx_avalanche.svg";
import glpArbitrum from "img/ic_glp_arbitrum.svg";
import glpAvax from "img/ic_glp_avalanche.svg";
import gmArbitrum from "img/ic_gm_arbitrum.svg";
import gmAvax from "img/ic_gm_avax.svg";
import gmxArbitrum from "img/ic_gmx_arbitrum.svg";
import gmxAvax from "img/ic_gmx_avax.svg";
import gmxOutlineIcon from "img/ic_gmxv1flat.svg";
import arbitrum from "img/tokens/ic_arbitrum.svg";
import arbitrumSepolia from "img/tokens/ic_arbitrum_sepolia.svg";
import avalanche from "img/tokens/ic_avalanche.svg";
import avalancheTestnet from "img/tokens/ic_avalanche_testnet.svg";
import base from "img/tokens/ic_base.svg";
import botanix from "img/tokens/ic_botanix.svg";
import esGMXIcon from "img/tokens/ic_esgmx.svg";
import eth from "img/tokens/ic_eth.svg";
import glpIcon from "img/tokens/ic_glp.svg";
import glvIcon from "img/tokens/ic_glv.svg";
import gmxIcon from "img/tokens/ic_gmx.svg";
import optimismSepolia from "img/tokens/ic_op.svg";
import sepolia from "img/tokens/ic_sepolia.svg";

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

export const CHAIN_ID_TO_NETWORK_ICON: Record<AnyChainId | GmxAccountPseudoChainId, string> = {
  [ARBITRUM]: arbitrum,
  [AVALANCHE]: avalanche,
  [GMX_ACCOUNT_PSEUDO_CHAIN_ID]: gmxIcon,
  [SOURCE_ETHEREUM_MAINNET]: eth,
  [SOURCE_BASE_MAINNET]: base,
  [AVALANCHE_FUJI]: avalancheTestnet,
  [ARBITRUM_SEPOLIA]: arbitrumSepolia,
  [SOURCE_OPTIMISM_SEPOLIA]: optimismSepolia,
  [SOURCE_SEPOLIA]: sepolia,
  [BOTANIX]: botanix,
  [SOURCE_BSC_MAINNET]: bsc,
};

/**
 * For chain icons use `getChainIcon`
 */
export function getIcon(chainId: number | "common", label: keyof ChainIcons) {
  if (!chainId || !(chainId in ICONS)) {
    throw new Error(`No icons found for chain: ${chainId}`);
  }

  return ICONS[chainId][label];
}

export function getChainIcon(chainId: number): string {
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
