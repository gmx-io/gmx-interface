import { ARBITRUM, AVALANCHE } from "config/chains";
import arbitrum from "img/ic_arbitrum_24.svg";
import avalanche from "img/ic_avalanche_24.svg";
import gmxIcon from "img/ic_gmx_40.svg";
import glpIcon from "img/ic_glp_40.svg";
import gmxArbitrum from "img/ic_gmx_arbitrum.svg";
import gmxAvax from "img/ic_gmx_avax.svg";
import glpArbitrum from "img/ic_glp_arbitrum.svg";
import glpAvax from "img/ic_glp_avax.svg";

type Icons = {
  [ARBITRUM]: {
    network: string;
    gmx: string;
    glp: string;
  };
  [AVALANCHE]: {
    network: string;
    gmx: string;
    glp: string;
  };
  gmx: string;
  glp: string;
};

const ICONS: Icons = {
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
  gmx: gmxIcon,
  glp: glpIcon,
};

export function getIcons(network, label) {
  if (!network) {
    return ICONS[label];
  }
  if (![ARBITRUM, AVALANCHE].includes(network)) return;
  return label ? ICONS[network][label] : ICONS[network];
}
