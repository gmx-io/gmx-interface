import { Trans } from '@lingui/macro';

export const PositionSellerErrorMessage = (error: unknown) => (
  <div>
    <Trans>Invalid closing position address</Trans>
    <br />
    {`${(error as Error).message}`}
  </div>
);
