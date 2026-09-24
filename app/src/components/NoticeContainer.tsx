import { useEffect, useState } from 'react';
import { NoticeComponent } from './useNotice';
import { NoticeItem } from './useNotice';
import { registerNoticeUpdater, removeNotice } from '@/utils/lib/helperNotice';

export const NoticeContainer = () => {
  const [notices, setNotices] = useState<NoticeItem[]>([]);

  useEffect(() => {
    registerNoticeUpdater(setNotices);
  }, []);

  return <NoticeComponent notices={notices} remove={removeNotice} />;
};



