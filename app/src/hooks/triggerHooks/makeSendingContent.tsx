import { TransactionInfo } from '@/utils/lib/transaction';

export const makeSendingContent = (info: TransactionInfo) =>
  function SendSuccessContent() {
    return (
      <div>
        {info.onSentMessage ? info.onSentMessage : info.message}
        {info.messageDetail && info.messageDetail}
      </div>
    );
  };
