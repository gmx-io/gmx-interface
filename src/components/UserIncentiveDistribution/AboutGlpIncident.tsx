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
          <Trans>About GLP Incident</Trans>
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
              GLV tokens are similar in composition to GLP, and enable seamless integration into GMX V2's liquidity
              ecosystem. Users can either sell or hold the tokens to earn yield. To encourage long-term participation, a
              $500,000 GLV incentive pool will be distributed proportionally to those who hold their allocated GLV for
              at least 3 months.
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
                GLV (GMX Liquidity Vaults) should be seen as GMX V2’s improved version of GLP. It is a yield-optimizing
                crypto-index token that
              </Trans>
            </p>
            <ul className="list-disc pl-12">
              <li>
                <Trans>earns fees from providing liquidity to multiple GMX V2 markets</Trans>
              </li>
              <li>
                <Trans>
                  dynamically allocates its liquidity to the highest-utilised markets, maximising capital efficiency and
                  annualized performance
                </Trans>
              </li>
              <li>
                <Trans>and automatically compounds its yield (unlike GLP, no manual claiming is needed)</Trans>
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
              Distribution happens in two GLV variants to mirror GLP's multi-asset exposure: one variant is optimized
              for ETH-based markets (50% ETH / 50% USDC) and the other for BTC-based markets (50% BTC / 50% USDC). This
              allocation reflects the composition of recovered funds and allows for dynamic shifting of GLV liquidity to
              all top GMX markets to enhance your yield.
            </Trans>
          </div>
        </ExpandableRow>

        <ExpandableRow
          contentClassName="flex flex-col gap-14"
          title={t`Can I sell my GLV if I want, and where?`}
          open={rowStates[3]}
          onToggle={toggleRow(3)}
          handleClassName="text-left"
          className="border-b-1/2 border-slate-600 py-16"
          chevronClassName="mr-8 mt-4"
        >
          <div className="text-typography-primary">
            <Trans>
              Yes, GLV is fully liquid and permissionless. You can sell via the GMX interface to redeem for underlying
              assets, with low fees.
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
              GLV earns from trading fees (open, close, borrow, liquidations, swaps) and trader losses across GM pools,
              with auto-compounding for seamless growth (20-30% historical average annualized performance). View
              real-time earnings, performance, and portfolio value on the <Link to="/pools">Pools page</Link>.
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
              A $500,000 GLV pool (funded by DAO funds) rewards long-term holders: If you keep your distributed GLV for
              at least 3 months (without selling or transferring), you'll receive a pro rata share.
            </Trans>
          </div>
        </ExpandableRow>
      </div>
    </div>
  );
}
