import IcAave from "img/ic_aave_24.svg?react";
import IcAda from "img/ic_ada_24.svg?react";
import IcApe from "img/ic_ape_24.svg?react";
import IcApt from "img/ic_apt_24.svg?react";
import IcArb from "img/ic_arb_24.svg?react";
import IcBtc from "img/ic_btc_24.svg?react";
import IcDai from "img/ic_dai_24.svg?react";
import IcDoge from "img/ic_doge_24.svg?react";
import IcDot from "img/ic_dot_24.svg?react";
import IcEth from "img/ic_eth_24.svg?react";
import IcPepe from "img/ic_pepe_24.svg?react";
import IcPol from "img/ic_pol_24.svg?react";
import IcShib from "img/ic_shib_24.svg?react";
import IcSol from "img/ic_sol_24.svg?react";
import IcTether from "img/ic_tether_24.svg?react";
import IcUni from "img/ic_uni_24.svg?react";
import IcUsdc from "img/ic_usdc_24.svg?react";
import IcWeth from "img/ic_weth_24.svg?react";

const icons = [
  IcShib,
  IcAave,
  IcEth,
  IcSol,
  IcApe,
  IcUsdc,
  IcApt,
  IcArb,
  IcBtc,
  IcWeth,
  IcDai,
  IcPepe,
  IcUni,
  IcDoge,
  IcDot,
  IcPol,
  IcTether,
  IcAda,
];

export function ChainIcons() {
  return (
    <div className="grid grid-cols-[repeat(6,64px)] gap-12">
      {icons.map((Icon, index) => (
        <div key={index} className="flex h-64 w-64 rounded-12 bg-fiord-700/50">
          <Icon className="m-auto" width={28} height={28} />
        </div>
      ))}
    </div>
  );
}
