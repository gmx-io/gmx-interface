import { Trans } from "@lingui/macro";
import cx from "classnames";

import { USD_DECIMALS } from "config/factors";
import { useAllPositions } from "domain/legacy";
import { useChainId } from "lib/chains";
import { getTimeRemaining } from "lib/dates";
import { formatAmount } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";
import { bigMath } from "sdk/utils/bigmath";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";

import "./PositionsOverview.css";

export default function PositionsOverview() {
  const { chainId } = useChainId();
  const { signer } = useWallet();

  const positions = useAllPositions(chainId, signer);

  return (
    <AppPageLayout>
      <div className="page-layout default-container">
        <p>
          <Trans>
            Open positions: {positions.length}
            <br />
            Under risk: {positions.filter((p) => p.danger).length}
          </Trans>
        </p>
        <div className="max-w-full overflow-auto">
          <table className="Positions-overview-table">
            <thead>
              <tr>
                <th>
                  <Trans>account</Trans>
                </th>
                <th>
                  <Trans>size</Trans>
                </th>
                <th>
                  <Trans>collateral</Trans>
                </th>
                <th>
                  <Trans>fee</Trans>
                </th>
                <th>
                  <Trans>time to liq</Trans>
                </th>
              </tr>
            </thead>
            <tbody>
              {positions &&
                positions
                  .filter((p) => p.danger)
                  .map((position, i) => {
                    const { size, account, collateral, fee, danger } = position;

                    const diffToLiq = position.collateral - position.fee;
                    const fundingFee = 80n;
                    const feesPerHour = bigMath.mulDiv(position.size, fundingFee, 1000000n);
                    const hoursToLiq = diffToLiq / feesPerHour;
                    const liqTime = Number(hoursToLiq) * 60 * 60 + Date.now() / 1000;
                    return (
                      <tr key={i}>
                        <td>{account}</td>
                        <td>
                          ${"\u200a"}
                          {formatAmount(size, USD_DECIMALS, 2, true)}
                        </td>
                        <td>
                          ${"\u200a"}
                          {formatAmount(collateral, USD_DECIMALS, 2, true)}
                        </td>
                        <td className={cx({ negative: danger })}>
                          ${"\u200a"}
                          {formatAmount(fee, USD_DECIMALS, 2, true)}
                        </td>
                        <td>
                          {getTimeRemaining(liqTime)} (${formatAmount(feesPerHour, USD_DECIMALS, 2, true)}/h)
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>
    </AppPageLayout>
  );
}
