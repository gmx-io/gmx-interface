import { useCallback, useEffect, useState } from 'react';
import { MdClose } from 'react-icons/md';
import MessageIcon from '../img/Message.svg';
import dayjs from 'dayjs';
import { useLingui } from '@lingui/react';
import { useLocation } from 'react-router-dom';
import { sanitizeNoticeHtml } from '../utils/sanitize/sanitizeNoticeHtml';

/**
 * Raw notice data structure fetched from external JSON.
 */
interface NoticeRawData {
  id: string;
  title: Record<string, string>;
  content: Record<string, string>;
  goLiveTime?: string;
  expirationTime?: string;
}

/**
 * Resolved notice for rendering. `sanitizedHtml` has already been passed
 * through DOMPurify with a strict allow-list, so it is safe to inject via
 * dangerouslySetInnerHTML.
 */
interface NoticeResolved {
  id: string;
  title: string;
  sanitizedHtml: string;
}

const NOTICES_JSON_URL = import.meta.env.VITE_NOTICES_JSON_URL;

const NOTICE_DISMISS_PREFIX = 'gmx-hide-notice-hash-';

/**
 * Pick the best locale match from a multilingual object.
 * Falls back to "en" if the current locale is not available.
 */
function pickLocale(map: Record<string, string>, locale: string): string {
  return map[locale] ?? map['en'] ?? Object.values(map)[0] ?? '';
}

/**
 * Filter raw notices by time window and dismissal status.
 */
function filterActiveNotices(
  notices: NoticeRawData[],
  locale: string,
): NoticeResolved[] {
  const now = dayjs().utc().unix();

  return notices
    .filter((n) => {
      // dismissed?
      if (localStorage.getItem(`${NOTICE_DISMISS_PREFIX}${n.id}`) === 'true') {
        return false;
      }
      // not yet live?
      if (n.goLiveTime) {
        const goLive = dayjs(n.goLiveTime).utc().unix();
        if (now < goLive) return false;
      }
      // expired?
      if (n.expirationTime) {
        const expire = dayjs(n.expirationTime).utc().unix();
        if (now > expire) return false;
      }
      return true;
    })
    .map((n) => ({
      id: n.id,
      title: pickLocale(n.title, locale),
      sanitizedHtml: sanitizeNoticeHtml(pickLocale(n.content, locale)),
    }));
}

const NoticeWindow = () => {
  const { i18n } = useLingui();
  const locale = i18n.locale;
  const location = useLocation();

  const [rawNotices, setRawNotices] = useState<NoticeRawData[]>([]);
  const [visibleNotices, setVisibleNotices] = useState<NoticeResolved[]>([]);

  // Fetch notices JSON once on mount.
  useEffect(() => {
    let cancelled = false;
    fetch(NOTICES_JSON_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<NoticeRawData[]>;
      })
      .then((data) => {
        if (!cancelled) setRawNotices(data);
      })
      .catch((err) => {
        console.warn('[NoticeWindow] Failed to fetch notices:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-evaluate visibility whenever raw data, locale, or time changes.
  const checkVisibility = useCallback(() => {
    setVisibleNotices(filterActiveNotices(rawNotices, locale));
  }, [rawNotices, locale]);

  useEffect(() => {
    checkVisibility();
    const timer = setInterval(checkVisibility, 10_000);
    return () => clearInterval(timer);
  }, [checkVisibility]);

  const handleClose = (id: string) => {
    localStorage.setItem(`${NOTICE_DISMISS_PREFIX}${id}`, 'true');
    setVisibleNotices((prev) => prev.filter((n) => n.id !== id));
  };

  if (location.pathname === '/') {
    return null;
  }

  return (
    <div
      className="z-10000 fixed right-[50%] w-[86vw] text-white shadow-lg md:!right-10 md:!max-w-[360px] md:!translate-x-0 md:!translate-y-0"
      style={{
        transform: `translateX(50%)`,
        top: 55,
      }}
    >
      {visibleNotices.map((notice) => (
        <div
          key={notice.id}
          className="mb-[1rem] rounded-[1.2rem] border border-[#535353]"
          style={{ background: '#1F1F1F' }}
        >
          <div className="flex items-center justify-between border-b-[0.5px] border-b-[#53535380] pt-[13.67px] pr-[12px] pb-[13.67px] pl-[13.67px]">
            <div className="flex items-center">
              <img src={MessageIcon} alt="message" width={20} className="mr-8" />
              <span className="text-[1.4rem] font-[500]">
                {notice.title}
              </span>
            </div>
            <div
              className="cursor-pointer p-2 hover:opacity-80"
              onClick={() => handleClose(notice.id)}
            >
              <MdClose fontSize={20} className="text-[#A3A3A3]" />
            </div>
          </div>

          <div className="overflow-auto p-12">
            <div
              className="leading-[1.4] [&_p]:!text-[14px] [&_p]:!font-[400]"
              dangerouslySetInnerHTML={{ __html: notice.sanitizedHtml }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default NoticeWindow;
