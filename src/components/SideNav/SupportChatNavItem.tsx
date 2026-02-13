import { show } from "@intercom/messenger-js-sdk";
import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useCallback } from "react";

import { SUPPORT_CHAT_WAS_EVER_CLICKED_KEY } from "config/localStorage";
import { useShowSupportChat } from "domain/supportChat/useShowSupportChat";
import { useSupportChatUnreadCount } from "domain/supportChat/useSupportChatUnreadCount";
import { useLocalStorageSerializeKey } from "lib/localStorage";

import SupportChatIcon from "img/ic_support_chat.svg?react";

import { NavItem } from "./SideNav";

import "./SupportChatNavItem.scss";

interface SupportChatNavItemProps {
  isCollapsed: boolean | undefined;
  onClick?: () => void;
}

export function SupportChatNavItem({ isCollapsed, onClick }: SupportChatNavItemProps) {
  const { shouldShowSupportChat } = useShowSupportChat();
  const [supportChatWasEverClicked, setSupportChatWasEverClicked] = useLocalStorageSerializeKey<boolean>(
    SUPPORT_CHAT_WAS_EVER_CLICKED_KEY,
    false
  );
  const [supportChatUnreadCount] = useSupportChatUnreadCount();
  const shouldShowCollapsedGradient = isCollapsed && !supportChatWasEverClicked;

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
      icon={
        <span className="relative">
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
          {supportChatUnreadCount > 0 && (
            <span className="absolute -right-2 -top-3 size-8 animate-pulse rounded-full bg-red-400" />
          )}
        </span>
      }
      label={
        <>
          <Trans>Support</Trans>{" "}
          {!supportChatWasEverClicked && (
            <span className="text-body-small rounded-full bg-blue-300/20 px-6 py-1">
              <span className="support-chat-new-badge inline-block font-medium">
                <Trans>New</Trans>
              </span>
            </span>
          )}
        </>
      }
      isCollapsed={isCollapsed}
      onClick={handleClick}
    />
  );
}
