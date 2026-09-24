import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { GoCheckCircle, GoChevronRight } from 'react-icons/go';
import closeIcons from '@/img/header/close.svg';
import CloseIcon from '@/img/header/close.svg?react';
import LoadingGreen from '@/img/Loading-green.svg?react';
import Confirmed from '@/img/Confirmed.svg?react';
import { getGmw415Enabled } from '@/config/featureFlagEnable';
import './NoticeCard.scss';

export const toastSuccessBackground = 'var(--Green-Background, #19382A)';
export const toastSuccessStrong = 'var(--Green-Strong, #31C366)';
export const toastErrorBackground = 'var(--Red-Background, #2D1919)';
export const toastErrorStrong = 'var(--Red-Strong, #FF5454)';
export const toastWarningStrong = 'var(--Button-Hovered, #FA7B4E)';

type NoticeType = 'success' | 'error' | 'info' | 'warning';
type NoticeCardType = 'toast' | 'notice';
type TypeColors = {
  titleColor: string;
  descriptionColor: string;
};

type NoticeCardProps = {
  title: ReactNode;
  description?: ReactNode;
  link?: string;
  onClose?: () => void;
  onLinkClick?: () => void;
  type?: NoticeType;
  cardType?: NoticeCardType;
  isLoading?: boolean;
  icon?: ReactNode;
  iconColor?: string;
  textColor?: string;
  bgColor?: string;
  barColor?: string;
  barPosition?: 'left' | 'bottom';
  barProgress?: number;
  dialogWidth?: string;
  className?: string;
  closeIconClass?: string;
};

const toastBottomBorderTypes: NoticeType[] = ['success', 'error', 'info'];

function getTypeColors(type: NoticeType, cardType: NoticeCardType): TypeColors {
  if (cardType === 'notice') {
    switch (type) {
      case 'success':
        return {
          titleColor: '#FFFFFF',
          descriptionColor: '#31C366',
        };
      case 'warning':
        return {
          titleColor: '#FFFFFF',
          descriptionColor: '#FFE166',
        };
      case 'error':
        return {
          titleColor: '#FFFFFF',
          descriptionColor: '#FF5454',
        };
      case 'info':
      default:
        return {
          titleColor: '#FFFFFF',
          descriptionColor: '#FA7B4E',
        };
    }
  }

  switch (type) {
    case 'success':
    case 'info':
      return {
        titleColor: toastSuccessStrong,
        descriptionColor: toastSuccessStrong,
      };
    case 'error':
      return {
        titleColor: toastErrorStrong,
        descriptionColor: toastErrorStrong,
      };
    default:
      return {
        titleColor: toastWarningStrong,
        descriptionColor: toastWarningStrong,
      };
  }
}

function getToastSurfaceBackground(type: NoticeType, cardType: NoticeCardType) {
  if (cardType !== 'toast') return undefined;
  if (type === 'success' || type === 'info') return toastSuccessBackground;
  if (type === 'error') return toastErrorBackground;
  return undefined;
}

function useLoadingProgress(isLoading: boolean) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;

    if (isLoading) {
      setProgress(0);
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + 5;
        });
      }, 500);
    } else {
      setProgress(100);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isLoading]);

  return progress;
}

type NoticeProgressBarProps = {
  cardType: NoticeCardType;
  isLoading: boolean;
  barPosition: NonNullable<NoticeCardProps['barPosition']>;
  barProgress: number;
  barColor: string;
  progress: number;
  isToastSuccessLike: boolean;
};

function NoticeProgressBar({
  cardType,
  isLoading,
  barPosition,
  barProgress,
  barColor,
  progress,
  isToastSuccessLike,
}: NoticeProgressBarProps) {
  if (cardType !== 'toast') return null;

  const barClass =
    barPosition === 'left'
      ? `absolute top-0 left-[-2px] w-[${barProgress ?? 10}px] h-[60px] rounded-[0.6rem] ${barColor}`
      : `absolute left-[1%] bottom-[-2px] w-[98%] h-[6px] rounded-[0.6rem] ${barColor}`;

  if (isLoading || barPosition === 'bottom') {
    return (
      <div className={barClass} style={{ zIndex: 1 }}>
        <div
          className={`${isToastSuccessLike ? '' : barColor} absolute left-0 top-0 rounded-[0.6rem]`}
          style={{
            zIndex: 1,
            width: `${progress}%`,
            height: barPosition === 'left' ? '60px' : '6px',
            transition: 'width 0.05s linear',
            ...(isToastSuccessLike
              ? { background: toastSuccessStrong }
              : {}),
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={barClass}
      style={{
        zIndex: 1,
        ...(isToastSuccessLike ? { background: toastSuccessStrong } : {}),
      }}
    />
  );
}

type NoticeIconProps = {
  icon?: ReactNode;
  isLoading: boolean;
  progress: number;
  cardType: NoticeCardType;
  type: NoticeType;
  iconColor: string;
  iconWrapperClass: string;
  iconWrapperStyle?: CSSProperties;
  isToastSuccessLike: boolean;
};

function NoticeIcon({
  icon,
  isLoading,
  progress,
  cardType,
  type,
  iconColor,
  iconWrapperClass,
  iconWrapperStyle,
  isToastSuccessLike,
}: NoticeIconProps) {
  if (icon || isLoading) {
    return (
      <div className={iconWrapperClass} style={iconWrapperStyle}>
        {icon ? (
          icon
        ) : isLoading && progress < 98 ? (
          isToastSuccessLike ? (
            <LoadingGreen className="animate-spin" />
          ) : (
            <AiOutlineLoading3Quarters className="animate-spin" />
          )
        ) : progress === 98 ? (
          isToastSuccessLike ? (
            <Confirmed className="notice-card__toast-success-icon" />
          ) : (
            <GoCheckCircle className={`mr-[1rem] text-[20px] ${iconColor}`} />
          )
        ) : null}
      </div>
    );
  }

  if (cardType === 'toast' && type === 'success') {
    return (
      <div className={iconWrapperClass} style={iconWrapperStyle}>
        <Confirmed className="notice-card__toast-success-icon" />
      </div>
    );
  }

  if (cardType !== 'toast') {
    return <GoCheckCircle className={`mr-[1rem] text-[20px] ${iconColor}`} />;
  }

  return null;
}

type NoticeCloseButtonProps = {
  cardType: NoticeCardType;
  closeIconClass: string;
  onClose?: () => void;
};

function NoticeCloseButton({
  cardType,
  closeIconClass,
  onClose,
}: NoticeCloseButtonProps) {
  if (!onClose) return null;

  return (
    <div className="cursor-pointer shrink-0" onClick={onClose}>
      {cardType === 'toast' ? (
        <CloseIcon
          aria-label="close"
          className={`notice-card__toast-close ${closeIconClass}`}
          style={{ maxWidth: 'none', width: '20px', height: '20px' }}
        />
      ) : (
        <img
          src={closeIcons}
          alt="close"
          className={closeIconClass}
          style={{ maxWidth: 'none', width: '20px', height: '20px' }}
        />
      )}
    </div>
  );
}

type NoticeDescriptionProps = {
  description?: string | ReactNode;
  link?: string;
  onLinkClick?: () => void;
  color: string;
};

function NoticeDescription({
  description,
  link,
  onLinkClick,
  color,
}: NoticeDescriptionProps) {
  if (!description) return null;
  if (typeof description === "string") {
    return (
      <div
        className="mt-[0.6rem] ml-[3rem] flex items-center text-[12px]"
        style={{
          color,
          wordBreak: 'break-word',
        }}
      >
        <span
          className={link ? 'cursor-pointer' : ''}
          onClick={() => {
            if (link) {
              window.open(link);
            } else {
              onLinkClick?.();
            }
          }}
          style={{ wordBreak: 'break-word' }}
        >
          {description}
        </span>
        {link && <GoChevronRight className="mt-[0.2rem] text-[12px]" />}
      </div>
    )
  } else {
    return (
      <div
        className="mt-[0.6rem] ml-[3rem] flex items-center text-[12px]"
        style={{
          color,
          wordBreak: 'break-word',
        }}
      >
        {description}
      </div>
    )
  }
}

export const NoticeCard = ({
  title,
  description,
  link,
  onLinkClick,
  onClose,
  type = 'info',
  cardType = 'toast',
  icon,
  iconColor = 'text-primary-300',
  textColor = 'text-white',
  bgColor = 'bg-[#FA7B4E33]',
  barColor = 'bg-primary-300',
  barPosition = 'left',
  isLoading = false,
  barProgress = 0,
  className = '',
  closeIconClass = '',
}: NoticeCardProps) => {
  const progress = useLoadingProgress(isLoading);
  const typeColors = getTypeColors(type, cardType);
  const toastSurfaceBackground = getToastSurfaceBackground(type, cardType);
  const isToastSuccessLike =
    cardType === 'toast' && (type === 'success' || type === 'info');
  const iconWrapperClass =
    cardType === 'toast'
      ? 'mr-[1rem] text-[20px]'
      : `mr-[1rem] text-[20px] ${iconColor}`;
  const iconWrapperStyle =
    cardType === 'toast'
      ? { color: typeColors.titleColor }
      : undefined;
  const cardBox =
    cardType === 'notice'
      ? { minWidth: '', height: 'min-h-[6rem]' }
      : { minWidth: 'w-[34rem]', height: 'min-h-[9.2rem]' };

  return (
    <div
      className={`relative flex ${cardBox.minWidth} ${cardBox.height} notice-card no-copy ${className}`}
    >
      <NoticeProgressBar
        cardType={cardType}
        isLoading={isLoading}
        barPosition={barPosition}
        barProgress={barProgress}
        barColor={barColor}
        progress={progress}
        isToastSuccessLike={isToastSuccessLike}
      />

      <div
        className={`flex min-h-8.2rem] w-full items-center justify-between rounded-[0.6rem] ${getGmw415Enabled() ? 'mb-[1rem]' : ''} ${toastSurfaceBackground ? '' : bgColor}`}
        style={{
          zIndex: 2,
          ...(toastSurfaceBackground
            ? { background: toastSurfaceBackground }
            : {}),
          ...(cardType === 'toast'
            ? ({
              '--toast-accent-color': typeColors.titleColor,
            } as CSSProperties)
            : {}),
          borderBottom:
            cardType === 'toast' &&
              toastBottomBorderTypes.includes(type)
              ? `2px solid ${typeColors.titleColor}`
              : 'none',
          borderLeft:
            cardType === 'notice'
              ? `2px solid ${typeColors.descriptionColor}`
              : 'none',
        }}
      >
        <div className={`flex w-full flex-col p-12 ${cardType === 'toast' ? 'text-[14px]' : 'text-[13px]'} ${textColor}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center font-medium">
              <NoticeIcon
                icon={icon}
                isLoading={isLoading}
                progress={progress}
                cardType={cardType}
                type={type}
                iconColor={iconColor}
                iconWrapperClass={iconWrapperClass}
                iconWrapperStyle={iconWrapperStyle}
                isToastSuccessLike={isToastSuccessLike}
              />
              <span
                style={{
                  color: typeColors.titleColor,
                  wordBreak: 'break-word',
                }}
              >
                {title}
              </span>
            </div>
            <NoticeCloseButton
              cardType={cardType}
              closeIconClass={closeIconClass}
              onClose={onClose}
            />
          </div>

          <NoticeDescription
            description={description}
            link={link}
            onLinkClick={onLinkClick}
            color={typeColors.descriptionColor}
          />
        </div>
      </div>
    </div>
  );
};
