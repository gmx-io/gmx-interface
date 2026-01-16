import { t, Trans } from "@lingui/macro";
import { useCallback, useState } from "react";
import { Link } from "react-router-dom";

import { ExpandableRow } from "components/ExpandableRow";

export function AboutGlpIncident() {
  const [rowStates, setRowStates] = useState<boolean[]>(new Array(6).fill(false));

  const toggleRow = useCallback(
    (index: number) => () => {
      setRowStates((prev) => {
        const newState = [...prev];
        newState[index] = !newState[index];
        return newState;
      });
    },
    [setRowStates]
  );

  return (
    <div>
      <div className="flex flex-col rounded-8 bg-slate-900 p-20">
        <div className="text-body-large mt-4 font-medium text-typography-primary">
          <Trans>About the GLP incident</Trans>
        </div>

        <ExpandableRow
          contentClassName="flex flex-col gap-14"
          title={t`Why is the claim in GLV tokens?`}
          open={rowStates[0]}
          onToggle={toggleRow(0)}
          handleClassName="text-left"
          className="border-b-1/2 border-slate-600 py-16"
          chevronClassName="mr-8 mt-4"
        >
          <div className="text-typography-primary">
            <Trans>
              GLV tokens mirror GLP's composition and integrate seamlessly into GMX V2's liquidity ecosystem. You can
              sell or hold to earn yield. A $500,000 GLV incentive pool rewards holders who keep their allocation for at
              least 3 months.
            </Trans>
          </div>
        </ExpandableRow>

        <ExpandableRow
          contentClassName="flex flex-col gap-14"
          title={t`What is GLV exactly?`}
          open={rowStates[1]}
          onToggle={toggleRow(1)}
          handleClassName="text-left"
          className="border-b-1/2 border-slate-600 py-16"
          chevronClassName="mr-8 mt-4"
        >
          <div className="text-typography-primary">
            <p className="mb-8">
              <Trans>
                GLV (GMX Liquidity Vaults) is GMX V2's improved version of GLP. It's a yield-optimizing crypto-index
                token that:
              </Trans>
            </p>
            <ul className="list-disc pl-12">
              <li>
                <Trans>Earns fees from liquidity provision across GMX V2 markets</Trans>
              </li>
              <li>
                <Trans>
                  Dynamically allocates liquidity to highest-utilized markets, maximizing capital efficiency and yield
                </Trans>
              </li>
              <li>
                <Trans>Auto-compounds yield (no manual claiming needed, unlike GLP)</Trans>
              </li>
            </ul>
          </div>
        </ExpandableRow>

        <ExpandableRow
          contentClassName="flex flex-col gap-14"
          title={t`Why do I receive two different GLV tokens?`}
          open={rowStates[2]}
          onToggle={toggleRow(2)}
          handleClassName="text-left"
          className="border-b-1/2 border-slate-600 py-16"
          chevronClassName="mr-8 mt-4"
        >
          <div className="text-typography-primary">
            <Trans>
              Two GLV variants mirror GLP's multi-asset exposure: one optimized for ETH markets (50% ETH / 50% USDC),
              the other for BTC markets (50% BTC / 50% USDC). This reflects the recovered funds composition and enables
              dynamic liquidity allocation across top GMX markets for enhanced yield.
            </Trans>
          </div>
        </ExpandableRow>

        <ExpandableRow
          contentClassName="flex flex-col gap-14"
          title={t`Can I sell my GLV, and where?`}
          open={rowStates[3]}
          onToggle={toggleRow(3)}
          handleClassName="text-left"
          className="border-b-1/2 border-slate-600 py-16"
          chevronClassName="mr-8 mt-4"
        >
          <div className="text-typography-primary">
            <Trans>
              Yes, GLV is fully liquid and permissionless. Sell via the GMX interface to redeem for underlying assets
              with low fees.
            </Trans>
          </div>
        </ExpandableRow>

        <ExpandableRow
          contentClassName="flex flex-col gap-14"
          title={t`How does GLV earn yield, and where do I see my earnings?`}
          open={rowStates[4]}
          onToggle={toggleRow(4)}
          handleClassName="text-left"
          className="border-b-1/2 border-slate-600 py-16"
          chevronClassName="mr-8 mt-4"
        >
          <div className="text-typography-primary">
            <Trans>
              GLV earns from trading fees (open, close, borrow, liquidations, swaps) and trader losses across GM pools.
              Yields auto-compound for seamless growth (20-30% historical APY). View earnings and portfolio value on the{" "}
              <Link to="/pools">Pools page</Link>.
            </Trans>
          </div>
        </ExpandableRow>

        <ExpandableRow
          contentClassName="flex flex-col gap-14"
          title={t`What is the bonus incentive for holding your GLV?`}
          open={rowStates[5]}
          onToggle={toggleRow(5)}
          handleClassName="text-left"
          className="pt-16"
          chevronClassName="mr-8 mt-4"
        >
          <div className="text-typography-primary">
            <Trans>
              A $500,000 GLV pool (DAO-funded) rewards long-term holders. Keep your GLV for at least 3 months without
              selling or transferring to receive a pro rata share.
            </Trans>
          </div>
        </ExpandableRow>
      </div>
    </div>
  );
}
