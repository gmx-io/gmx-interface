import { Trans } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import cx from "classnames";

import { useAllPositions } from "domain/legacy";
import { USD_DECIMALS } from "lib/legacy";

import "./PositionsOverview.css";
import { formatAmount } from "lib/numbers";
import { useChainId } from "lib/chains";
import { getTimeRemaining } from "lib/dates";

export default function PositionsOverview() {
  const { chainId } = useChainId();
  const { library } = useWeb3React();

  const positions = useAllPositions(chainId, library);

  return (
    <div className="Positions-overview">
      <p>
        <Trans>
          Open positions: {positions.length}
          <br />
          Under risk: {positions.filter((p) => p.danger).length}
        </Trans>
      </p>
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
              .map((position) => {
                const { size, account, collateral, fee, danger } = position;

                const diffToLiq = position.collateral.sub(position.fee);
                const fundingFee = 80;
                const feesPerHour = position.size.mul(fundingFee).div(1000000);
                const hoursToLiq = diffToLiq.div(feesPerHour);
                const liqTime = hoursToLiq.toNumber() * 60 * 60 + Date.now() / 1000;
                return (
                  <tr>
                    <td>{account}</td>
                    <td>${formatAmount(size, USD_DECIMALS, 2, true)}</td>
                    <td>${formatAmount(collateral, USD_DECIMALS, 2, true)}</td>
                    <td className={cx({ negative: danger })}>${formatAmount(fee, USD_DECIMALS, 2, true)}</td>
                    <td>
                      {getTimeRemaining(liqTime)} (${formatAmount(feesPerHour, USD_DECIMALS, 2, true)}/h)
                    </td>
                  </tr>
                );
              })}
        </tbody>
      </table>
    </div>
  );
}
