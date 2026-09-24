import { ReactNode } from 'react';
import { NoticeType, NoticeItem, CardType } from '@/components/useNotice';
import { ErrorToastWithSupport } from '@/domain/supportChat/ErrorToastWithSupport';
import { TradingErrorInfo, tradingErrorTracker } from '@/domain/supportChat/tradingErrorTracker';

let noticeQueue: NoticeItem[] = [];
let noticeIdCounter = 0;
let updateCallback: ((notices: NoticeItem[]) => void) | null = null;

export const registerNoticeUpdater = (callback: (notices: NoticeItem[]) => void) => {
  updateCallback = callback;
};

const addNotice = (
  title: ReactNode,
  type: NoticeType,
  options?: {
    description?: string;
    duration?: number;
    isLoading?: boolean;
    cardType?: CardType;
  }
): number => {
  const newNotice: NoticeItem = {
    id: ++noticeIdCounter,
    title,  
    type,
    cardType: options?.cardType || 'toast',
    description: options?.description,
    duration: options?.duration || 3000,
    isLoading: options?.isLoading !== undefined ? options.isLoading : false,
    barPosition: 'left',
  };

  noticeQueue = [...noticeQueue, newNotice];
  if (updateCallback) {
    updateCallback([...noticeQueue]);
  }
  
  return newNotice.id;
};

export const removeNotice = (id: number) => {
  noticeQueue = noticeQueue.filter((notice) => notice.id !== id);
  if (updateCallback) {
    updateCallback([...noticeQueue]);
  }
};

export const dismissAllNotices = () => {
  noticeQueue = [];
  if (updateCallback) {
    updateCallback([]);
  }
};

export const helperNotice = {
  success: (content: ReactNode, opts?: { description?: string; duration?: number; cardType?: CardType }): number => {
    return addNotice(content, 'success', opts);  
  },

  error: (
    content: ReactNode,
    opts?: { description?: string; duration?: number; cardType?: CardType; tradingErrorInfo?: TradingErrorInfo }
  ): number => {
    const { tradingErrorInfo, ...noticeOpts } = opts ?? {};
    const error = tradingErrorInfo ? tradingErrorTracker.reportError(tradingErrorInfo) : undefined;
    // Capture this notice's error rather than reading the latest error on click.
    const finalContent = error && tradingErrorTracker.shouldSuggestSupport()
      ? <ErrorToastWithSupport error={error}>{content}</ErrorToastWithSupport>
      : content;
    return addNotice(finalContent, 'error', { ...noticeOpts, duration: opts?.duration || (finalContent !== content ? 15000 : 4000) });
  },

  info: (content: ReactNode, opts?: {description?: string; duration?: number; isLoading?: boolean; cardType?: CardType }): number => {
    return addNotice(content, 'info', {  
      ...opts, 
      isLoading: opts?.isLoading !== undefined ? opts.isLoading : true,
      duration: opts?.duration !== undefined ? opts.duration : 999999
    });
  },

  warning: (content: ReactNode, opts?: { description?: string; duration?: number; cardType?: CardType }): number => {
    return addNotice(content, 'warning', opts);  
  },
};
