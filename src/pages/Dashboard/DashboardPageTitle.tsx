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
              GMX is the utility and governance token. It also accrues 27% of the protocol fees via a buyback and
              distribution mechanism.
            </Trans>
            <br />
            <Trans>
              GLP is the liquidity provider token for GMX V1 markets. Accrues 70% of the V1 markets generated fees.
            </Trans>
          </>
        ) : (
          <>
            <Trans>
              GMX is the utility and governance token. It also accrues 27% of the protocol fees via a buyback and
              distribution mechanism.
            </Trans>
            <br />
            <Trans>
              GM is the liquidity provider token for GMX V2 markets. Accrues 63% of the V2 markets generated fees.
            </Trans>
          </>
        )
      }
    />
  );
}
