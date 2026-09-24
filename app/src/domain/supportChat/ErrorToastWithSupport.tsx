import { showNewMessage } from '@intercom/messenger-js-sdk';
import { Trans } from '@lingui/macro';
import { ReactNode, useRef } from 'react';

import SupportChatIcon from '@/img/support-chat.svg?react';

import { buildSupportRequest } from './supportRequest';
import { SupportError } from './tradingErrorTracker';
import { reportSupportError } from './reportSupportError';

export function ErrorToastWithSupport({
  children,
  error,
}: {
  children: ReactNode;
  error: SupportError;
}) {
  const debugLogId = useRef<string>();

  const handleContactSupport = () => {
    if (!debugLogId.current) {
      const id = crypto.randomUUID();
      reportSupportError(error, id);
      debugLogId.current = id;
    }
    showNewMessage(buildSupportRequest(error, debugLogId.current));
  };

  return (
    <div>
      {children}
      <div className="mt-8 border-t border-white/10 pt-8">
        <button
          type="button"
          className="inline-flex items-center gap-6 border-none bg-transparent p-0 text-inherit underline"
          onClick={handleContactSupport}
        >
          <Trans>Contact support</Trans>
          <SupportChatIcon className="h-16 w-16 shrink-0" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
