import { show } from "@intercom/messenger-js-sdk";
import { Trans } from "@lingui/macro";
import { useCallback } from "react";

import { SUPPORT_CHAT_WAS_EVER_CLICKED_KEY } from "config/localStorage";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useShowSupportChat, useSupportChatUnreadCount } from "lib/supportChat";

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
          <SupportChatIcon className="size-24" />
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
