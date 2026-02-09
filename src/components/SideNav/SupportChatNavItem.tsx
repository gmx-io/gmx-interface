import { show } from "@intercom/messenger-js-sdk";
import { Trans } from "@lingui/macro";
import { useCallback } from "react";

import { useEligibleToShowSupportChat } from "lib/supportChat";

import SupportChatIcon from "img/ic_support_chat.svg?react";

import { NavItem } from "./SideNav";

interface SupportChatNavItemProps {
  isCollapsed: boolean | undefined;
  onClick?: () => void;
}

export function SupportChatNavItem({ isCollapsed, onClick }: SupportChatNavItemProps) {
  const eligibleToShowSupportChat = useEligibleToShowSupportChat();

  const handleClick = useCallback(() => {
    onClick?.();
    show();
  }, [onClick]);

  if (!eligibleToShowSupportChat) {
    return null;
  }

  return (
    <NavItem
      icon={<SupportChatIcon className="size-24" />}
      label={
        <>
          <Trans>Support</Trans>{" "}
          <span className="text-body-small rounded-8 bg-slate-600 px-6 py-2 text-typography-primary">
            <Trans>NEW</Trans>
          </span>
        </>
      }
      isCollapsed={isCollapsed}
      onClick={handleClick}
    />
  );
}
