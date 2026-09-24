import React, { useEffect, useState, useCallback, ReactElement } from 'react';
import {
  NoticeCard,
  toastErrorStrong,
  toastSuccessStrong,
} from './NoticeCard';
import { MdWarning } from 'react-icons/md';

import LoadingBlue from '@/img/Loading-bule.svg?react';
import LoadingGreen from '@/img/Loading-green.svg?react';
import Confirmed from '@/img/Confirmed.svg?react';
import Info from '@/img/info.svg?react';
import TipIcon from '@/img/leverageTipIcon.svg?react';
import Alert from '@/img/Alert.svg?react';
import { getGmw404Enabled } from '@/config/featureFlagEnable';

export type NoticeType = 'success' | 'error' | 'info' | 'warning';
export type CardType = 'toast' | 'notice';

export interface NoticeItem {
  id: number;
  title: string | React.ReactNode;
  description?: string;
  type?: NoticeType;
  cardType?: CardType;
  duration?: number;
  isLoading?: boolean;
  barPosition?: 'left' | 'bottom';
}

interface NoticeQueueProps {
  notices: NoticeItem[];
  remove: (id: number) => void;
}

const toastStyles: Record<
  NoticeType,
  { iconColor: string; barColor: string; bgColor: string }
> = {
  success: {
    iconColor: 'text-green-400',
    barColor: 'bg-green-400',
    bgColor: 'bg-[#19382A]',
  },
  error: {
    iconColor: 'text-red-400',
    barColor: 'bg-red-400',
    bgColor: 'bg-[#2D1919]',
  },
  info: {
    iconColor: 'text-green-400',
    barColor: 'bg-green-400',
    bgColor: 'bg-[#19382A]',
  },
  warning: {
    iconColor: 'text-yellow-400',
    barColor: 'bg-yellow-400',
    bgColor: 'bg-[#2A261F]',
  },
};

export const noticeStyles: Record<
  NoticeType,
  { iconColor: string; barColor: string; bgColor: string }
> = {
  success: {
    iconColor: 'text-green-400',
    barColor: 'bg-green-400',
    bgColor: 'bg-[#19382A]',
  },
  error: {
    iconColor: 'text-red-400',
    barColor: 'bg-red-400',
    bgColor: 'bg-[#2D1919]',
  },
  info: {
    iconColor: 'text-primary-400',
    barColor: 'bg-primary-400',
    bgColor: 'bg-[#FA7B4E33]',
  },
  warning: {
    iconColor: 'text-yellow-400',
    barColor: 'bg-yellow-400',
    bgColor: 'bg-[#2A261F]',
  },
};

export const noticeIconColors: Record<NoticeType, string> = {
  info: '#FA7B4E',
  error: '#FF5454',
  warning: '#FFE166',
  success: '#31C366',
};

const toastIconColors: Record<NoticeType, string> = {
  success: toastSuccessStrong,
  error: toastErrorStrong,
  info: toastSuccessStrong,
  warning: '#FFE166',
};

export const getNoticeConfig = (type: NoticeType = 'info') => {
  const bgColor = noticeStyles[type].bgColor;
  const iconColor = noticeIconColors[type];

  let icon: React.ReactNode;
  switch (type) {
    case 'success':
      icon = <Confirmed style={{ stroke: iconColor }} />;
      break;
    case 'error':
      icon = <Alert className="notice-card__toast-error-icon" />;
      break;
    case 'warning':
      icon = <TipIcon />;
      break;
    case 'info':
      icon = <Info className="notice-card__toast-info-icon" />;
      break;
    default:
      icon = <Confirmed style={{ stroke: iconColor }} />;
  }

  return {
    bgColor,
    iconColor,
    icon,
  };
};

export const NoticeComponent: React.FC<NoticeQueueProps> = ({
  notices,
  remove,
}) => {
  return (
    <div
      className={`fixed bottom-[0.8rem] right-[1.2rem] flex flex-col gap-3 ${
        getGmw404Enabled() ? 'z-[99999]' : 'z-[9999]'
      }`}
    >
      {notices.map((n) => (
        <AnimatedNotice key={n.id} notice={n} remove={remove} />
      ))}
    </div>
  );
};

interface AnimatedNoticeProps {
  notice: NoticeItem;
  remove: (id: number) => void;
}

const AnimatedNotice: React.FC<AnimatedNoticeProps> = ({ notice, remove }) => {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const styleConfig = notice.cardType === 'notice' ? noticeStyles : toastStyles;
  const style = styleConfig[notice.type || 'info'];
  const duration = notice.duration || 3000;

  useEffect(() => {
    const enterTimer = setTimeout(() => setVisible(true), 10);

    let interval: NodeJS.Timer | null = null;
    let autoClose: NodeJS.Timeout | null = null;

    if (notice.isLoading) {
      const step = 20;
      const increment = (step / duration) * 100;
      interval = setInterval(() => {
        setProgress((prev) => {
          const next = prev + increment;
          if (next >= 100) {
            clearInterval(interval);
            handleClose();
          }
          return Math.min(next, 100);
        });
      }, step) as NodeJS.Timer;
    } else {
      autoClose = setTimeout(() => handleClose(), duration);
    }

    return () => {
      clearTimeout(enterTimer);
      if (interval) clearInterval(interval);
      if (autoClose) clearTimeout(autoClose);
    };
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => remove(notice.id), 300);
  };

  const isToastSuccessLike =
    (notice.cardType || 'toast') === 'toast' &&
    (notice.type === 'info' || notice.type === 'success');

  const getDefaultIcon = () => {
    if (notice.isLoading && progress < 98) {
      return isToastSuccessLike ? (
        <LoadingGreen className="animate-spin" />
      ) : (
        <LoadingBlue className="animate-spin" />
      );
    }

    if (notice.cardType === 'notice') {
      const color = noticeIconColors[notice.type || 'info'];
      return <Confirmed style={{ stroke: color }} />;
    }

    switch (notice.type) {
      case 'success':
        return (
          <Confirmed
            className="notice-card__toast-success-icon"
            style={{ stroke: toastIconColors.success }}
          />
        );
      case 'info':
        return progress === 98 ? (
          <Confirmed
            className="notice-card__toast-success-icon"
            style={{ stroke: toastIconColors.success }}
          />
        ) : null;
      case 'error':
        return <Alert className="notice-card__toast-error-icon" />;
      case 'warning':
        return <MdWarning />;
      default:
        return <Confirmed style={{ stroke: toastIconColors.success }} />;
    }
  };

  return (
    <div
      className={`transform transition-all duration-300 ease-in-out 
                  ${visible ? 'translate-x-0 opacity-100' : 'translate-x-[calc(100%+2rem)] opacity-0'}`}
    >
      <NoticeCard
        type={notice.type}
        cardType={notice.cardType || 'toast'}
        title={notice.title}
        description={notice.description}
        icon={getDefaultIcon()}
        iconColor={style.iconColor}
        bgColor={style.bgColor}
        barColor={style.barColor}
        onClose={handleClose}
        isLoading={notice.isLoading}
        barPosition={notice.barPosition || 'left'}
        barProgress={progress}
      />
    </div>
  );
};
