import ExternalLink from '@/components/Common/Link/ExternalLink';
import { getGmw378Enabled } from '@/config/featureFlagEnable';
import { useCurrentRpcUrl } from '@/hooks/utilsHooks/useCurrentRpcUrl';
import { getTransactionUrl } from '@/utils/lib/explorer';
import { getTransactionUrl as getTransactionUrlNew } from '@/utils/lib/explorerNew';
import { t, Trans } from '@lingui/macro';

export const makeSendErrorContent = (errorMessage: string | undefined) =>
  function SendErrorContent() {
    const signature = extractSignatureFromError(errorMessage ?? '');
    const isGmw378Enabled = getGmw378Enabled();
    const currentRpcUrl = useCurrentRpcUrl();
    const txUrl = signature
      ? isGmw378Enabled
        ? getTransactionUrlNew(signature)
        : getTransactionUrl(signature, currentRpcUrl)
      : null;
    return (
      <div>
        <Trans>Send transaction error.</Trans><br />
        <Trans>Error message: {errorMessage}</Trans>
        {txUrl && (
          <>
            {/* <br />
            <br /> */}
            <ExternalLink href={txUrl}>{t`View the failed Tx`}</ExternalLink>
          </>
        )}
      </div>
    );
  };

function extractSignatureFromError(error: string): string | null {
  const match = error.match(/Raw transaction (.*) failed/);
  return match ? match[1] : null;
}
