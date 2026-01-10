import { Trans, t } from "@lingui/macro";

import PageTitle from "components/PageTitle/PageTitle";

export function DashboardPageTitle({ tradePageVersion }: { tradePageVersion: number }) {
  return (
    <PageTitle
      title={t`Tokens`}
      subtitle={
        tradePageVersion === 1 ? (
          <>
            <Trans>
              GMX is the utility and governance token. Accrues 27% of protocol fees via buyback and distribution.
            </Trans>
            <br />
            <Trans>GLP is the liquidity provider token for GMX V1 markets. Accrues 70% of V1 market fees.</Trans>
          </>
        ) : (
          <>
            <Trans>
              GMX is the utility and governance token. Accrues 27% of protocol fees via buyback and distribution.
            </Trans>
            <br />
            <Trans>GM is the liquidity provider token for GMX V2 markets. Accrues 63% of V2 market fees.</Trans>
          </>
        )
      }
    />
  );
}
