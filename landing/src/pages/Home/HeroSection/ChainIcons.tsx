import IcAave from "img/tokens/ic_aave.svg?react";
import IcAda from "img/tokens/ic_ada.svg?react";
import IcApe from "img/tokens/ic_ape.svg?react";
import IcApt from "img/tokens/ic_apt.svg?react";
import IcArb from "img/tokens/ic_arb.svg?react";
import IcAtom from "img/tokens/ic_atom.svg?react";
import IcBtc from "img/tokens/ic_btc.svg?react";
import IcDai from "img/tokens/ic_dai.svg?react";
import IcDoge from "img/tokens/ic_doge.svg?react";
import IcDot from "img/tokens/ic_dot.svg?react";
import IcEth from "img/tokens/ic_eth.svg?react";
import IcLink from "img/tokens/ic_link.svg?react";
import IcNear from "img/tokens/ic_near.svg?react";
import IcOp from "img/tokens/ic_op.svg?react";
import IcPepe from "img/tokens/ic_pepe.svg?react";
import IcPol from "img/tokens/ic_pol.svg?react";
import IcShib from "img/tokens/ic_shib.svg?react";
import IcSol from "img/tokens/ic_sol.svg?react";
import IcStx from "img/tokens/ic_stx.svg?react";
import IcTether from "img/tokens/ic_tether.svg?react";
import IcTrx from "img/tokens/ic_trx.svg?react";
import IcUni from "img/tokens/ic_uni.svg?react";
import IcUsdc from "img/tokens/ic_usdc.svg?react";
import IcWeth from "img/tokens/ic_weth.svg?react";

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
        <div key={index} className="flex size-64 rounded-12 bg-slate-800/50">
          <Icon className="m-auto size-28" />
        </div>
      ))}
    </div>
  );
}
