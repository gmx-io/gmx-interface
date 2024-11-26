// eslint-disable-next-line
import {
  ARBITRUM,
  ARBITRUM_TESTNET,
  AVALANCHE,
  AVALANCHE_FUJI,
  BLAST_SEPOLIA_TESTNET,
  MORPH_L2,
  MORPH_MAINNET,
  OPTIMISM_GOERLI_TESTNET,
  OPTIMISM_MAINNET,
  SEPOLIA_TESTNET,
} from "config/chains";
import arbitrum from "img/ic_arbitrum_24.svg";
import avalanche from "img/ic_avalanche_24.svg";
import avalancheTestnet from "img/ic_avalanche_testnet_24.svg";
import sepoliaTesnet from "img/ic_sepolia_testnet_24.svg";
import morphIcn from "img/ic_morph_l2.svg";

import optimismIcn from "img/icn_opt_24.svg";
import tmxImg from "img/ic_tmx.svg";
import tlpImg from "img/ic_tlp.svg";
import blastIcn from "img/icn_blast.svg";

const ICONS = {
  [ARBITRUM]: {
    network: arbitrum,
    gmx: tmxImg,
    glp: tlpImg,
  },
  [AVALANCHE]: {
    network: avalanche,
    gmx: tmxImg,
    glp: tlpImg,
  },
  [ARBITRUM_TESTNET]: {
    network: arbitrum,
    gmx: tmxImg,
    glp: tlpImg,
  },
  [AVALANCHE_FUJI]: {
    network: avalancheTestnet,
    gmx: tmxImg,
    glp: tlpImg,
  },
  [SEPOLIA_TESTNET]: {
    network: sepoliaTesnet,
    gmx: tmxImg,
    glp: tlpImg,
  },
  [BLAST_SEPOLIA_TESTNET]: {
    network: blastIcn,
    gmx: tmxImg,
    glp: tlpImg,
  },
  [OPTIMISM_GOERLI_TESTNET]: {
    network: optimismIcn,
    gmx: tmxImg,
    glp: tlpImg,
  },
  [OPTIMISM_MAINNET]: { network: optimismIcn, gmx: tmxImg, glp: tlpImg },
  common: {
    gmx: tmxImg,
    glp: tlpImg,
  },
  [MORPH_L2]: {
    network: morphIcn,
    gmx: tmxImg,
    glp: tlpImg,
  },
  [MORPH_MAINNET]: {
    network: morphIcn,
    gmx: tmxImg,
    glp: tlpImg,
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
