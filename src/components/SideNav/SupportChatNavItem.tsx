import { show } from "@intercom/messenger-js-sdk";
import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { useCallback } from "react";

import { SUPPORT_CHAT_WAS_EVER_CLICKED_KEY } from "config/localStorage";
import { useShowSupportChat } from "domain/supportChat/useShowSupportChat";
import { useSupportChatUnreadCount } from "domain/supportChat/useSupportChatUnreadCount";
import { useLocalStorageSerializeKey } from "lib/localStorage";

import { AnimatedGradientText } from "components/AnimatedGradientText/AnimatedGradientText";

import SupportChatIcon from "img/ic_support_chat.svg?react";

import { NavItem } from "./SideNav";

import "./SupportChatNavItem.scss";

interface SupportChatNavItemProps {
  isCollapsed: boolean | undefined;
  onClick?: () => void;
}

const MAX_UNREAD_COUNT = 9;

function getUnreadCountLabel(unreadCount: number) {
  return unreadCount > MAX_UNREAD_COUNT ? `${MAX_UNREAD_COUNT}+` : unreadCount;
}

function UnreadCountBadge({ unreadCount, isCollapsed = false }: { unreadCount: number; isCollapsed?: boolean }) {
  return (
    <span
      aria-hidden={isCollapsed || undefined}
      className={cx(
        "text-body-small flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-blue-300 font-medium text-white dark:text-black",
        isCollapsed
          ? "absolute -right-10 -top-8 size-16 outline outline-2 outline-[var(--color-slate-950)] group-hover:hidden"
          : "size-20"
      )}
    >
      {getUnreadCountLabel(unreadCount)}
    </span>
  );
}

export function SupportChatNavItem({ isCollapsed, onClick }: SupportChatNavItemProps) {
  const { shouldShowSupportChat } = useShowSupportChat();
  const [supportChatWasEverClicked, setSupportChatWasEverClicked] = useLocalStorageSerializeKey<boolean>(
    SUPPORT_CHAT_WAS_EVER_CLICKED_KEY,
    false
  );
  const [supportChatUnreadCount] = useSupportChatUnreadCount();
  const hasUnreadMessages = supportChatUnreadCount > 0;
  const shouldShowNewBadge = !supportChatWasEverClicked && !hasUnreadMessages;
  const shouldShowCollapsedGradient = isCollapsed && shouldShowNewBadge;
  let collapsedAriaLabel: string | undefined;

  if (isCollapsed) {
    const supportLabel = t`Support`;
    collapsedAriaLabel = supportLabel;

    if (hasUnreadMessages) {
      collapsedAriaLabel = `${supportLabel}: ${getUnreadCountLabel(supportChatUnreadCount)}`;
    } else if (shouldShowNewBadge) {
      collapsedAriaLabel = `${supportLabel}: ${t`New`}`;
    }
  }

  const handleClick = useCallback(() => {
    setSupportChatWasEverClicked(true);
    onClick?.();
    show();
  }, [onClick, setSupportChatWasEverClicked]);

  if (!shouldShowSupportChat) {
    return null;
  }

  return (
    <NavItem
      ariaLabel={collapsedAriaLabel}
      icon={
        <span className="relative inline-flex">
          {shouldShowCollapsedGradient && (
            <svg className="support-chat-icon-gradient-defs" aria-hidden="true" width="0" height="0" focusable="false">
              <defs>
                <linearGradient id="support-chat-icon-collapsed-gradient" x1="-60%" y1="0%" x2="160%" y2="100%">
                  <animateTransform
                    attributeName="gradientTransform"
                    type="translate"
                    values="-0.22 0;0.22 0;-0.22 0"
                    dur="4.8s"
                    repeatCount="indefinite"
                  />
                  <stop offset="0%" stopColor="#2D42FC" />
                  <stop offset="80%" stopColor="#A4C3F9" />
                  <stop offset="100%" stopColor="#A4C3F9" />
                </linearGradient>
              </defs>
            </svg>
          )}
          <SupportChatIcon
            className={cx("size-20", {
              "support-chat-icon-collapsed": shouldShowCollapsedGradient,
            })}
          />
          {hasUnreadMessages && isCollapsed && <UnreadCountBadge unreadCount={supportChatUnreadCount} isCollapsed />}
        </span>
      }
      label={
        <span className="inline-flex items-center gap-6 leading-[1]">
          <Trans>Support</Trans>
          {hasUnreadMessages ? (
            <UnreadCountBadge unreadCount={supportChatUnreadCount} />
          ) : (
            shouldShowNewBadge && (
              <span className="text-body-small rounded-full bg-blue-300/20 px-6 py-1">
                <AnimatedGradientText className="inline-block font-medium">
                  <Trans>New</Trans>
                </AnimatedGradientText>
              </span>
            )
          )}
        </span>
      }
      isCollapsed={isCollapsed}
      onClick={handleClick}
    />
  );
}
