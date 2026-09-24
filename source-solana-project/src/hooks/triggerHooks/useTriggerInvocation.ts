import { makeSendingContent } from '@/hooks/triggerHooks/makeSendingContent';
import { makeSendErrorContent } from '@/hooks/triggerHooks/makeSendErrorContent';
import { usePending } from '@/contexts/pending';
import { helperNotice, removeNotice } from '@/utils/lib/helperNotice';
import { TriggerOptions } from '@/utils/lib/transaction';
import { TransactionInfo } from '@/utils/lib/transaction';
import { useCallback, useMemo, createElement } from 'react';
import useSWRMutation, { MutationFetcher } from 'swr/mutation';

export const useTriggerInvocation = <T>(
  info: TransactionInfo,
  invoke: (arg: T) => Promise<string>,
  opts?: TriggerOptions
) => {
  const { setPendingTxs } = usePending();
  const { key } = info;

  const fetcher: MutationFetcher<string, string, { arg: T }> = useCallback(
    async (_key, { arg: { arg } }) => {
      const signature = await invoke(arg);
      setPendingTxs((txs) => {
        return [
          ...txs,
          {
            ...info,
            signature,
          },
        ];
      });
      return signature;
    },
    [info, invoke, setPendingTxs]
  );

  const { trigger, isMutating } = useSWRMutation<
    string,
    Error,
    string,
    { arg: T },
    string
  >(key, fetcher, {
    throwOnError: false,
  });

  return useMemo(() => {
    return {
      isSending: isMutating,
      trigger: (arg: T) => {
        let noticeId = 0;
        const res = trigger(
          { arg },
          {
            onSuccess: () => {
              if (opts?.onSuccess) {
                if (noticeId) {
                  removeNotice(noticeId);
                }
                opts.onSuccess();
              }
            },
            onError: (error: Error) => {
              console.error(error);
              if (!opts?.disableErrorToast) {
                if (noticeId) {
                  removeNotice(noticeId);
                }
                const ErrorContent = makeSendErrorContent(error.message);
                helperNotice.error(createElement(ErrorContent), {
                  tradingErrorInfo: { actionName: info.key, errorData: error },
                });
              }
              if (opts?.onError) {
                opts.onError();
              }
            },
          }
        );
        if (!opts?.disableSendingToast) {
          const SendingContent = makeSendingContent(info);
          noticeId = helperNotice.info(createElement(SendingContent));
        }
        return res;
      },
    };
  }, [info, isMutating, opts, trigger]);
};
