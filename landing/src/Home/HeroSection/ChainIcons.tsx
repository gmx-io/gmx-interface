import IcAave from "img/ic_aave_24.svg?react";
import IcAda from "img/ic_ada_24.svg?react";
import IcApe from "img/ic_ape_24.svg?react";
import IcApt from "img/ic_apt_24.svg?react";
import IcArb from "img/ic_arb_24.svg?react";
import IcAtom from "img/ic_atom_24.svg?react";
import IcBtc from "img/ic_btc_24.svg?react";
import IcDai from "img/ic_dai_24.svg?react";
import IcDoge from "img/ic_doge_24.svg?react";
import IcDot from "img/ic_dot_24.svg?react";
import IcEth from "img/ic_eth_24.svg?react";
import IcLink from "img/ic_link_24.svg?react";
import IcNear from "img/ic_near_24.svg?react";
import IcOp from "img/ic_op_24.svg?react";
import IcPepe from "img/ic_pepe_24.svg?react";
import IcPol from "img/ic_pol_24.svg?react";
import IcShib from "img/ic_shib_24.svg?react";
import IcSol from "img/ic_sol_24.svg?react";
import IcStx from "img/ic_stx_24.svg?react";
import IcTether from "img/ic_tether_24.svg?react";
import IcTrx from "img/ic_trx_24.svg?react";
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
  IcAtom,
  IcNear,
  IcOp,
  IcStx,
  IcTrx,
  IcLink,
];

export function ChainIcons() {
  return (
    <div className="grid grid-cols-[repeat(12,56px)] gap-12 md:grid-cols-[repeat(12,64px)] lg:grid-cols-[repeat(6,64px)]">
      {icons.map((Icon, index) => (
        <div key={index} className="flex h-64 w-64 rounded-12 bg-slate-800/50">
          <Icon className="m-auto" width={28} height={28} />
        </div>
      ))}
    </div>
  );
}
