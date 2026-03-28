import { SUPPORT_CHAT_USER_ID_KEY } from "config/localStorage";
import { ThemeMode } from "context/ThemeContext/ThemeContext";
import { getRequestId } from "lib/metrics/utils";

export function getOrCreateSupportChatUserId(): string {
  const existingSupportChatUserId = localStorage.getItem(SUPPORT_CHAT_USER_ID_KEY);
  if (existingSupportChatUserId) {
    return existingSupportChatUserId;
  }

  const newSupportChatUserId = getRequestId();
  localStorage.setItem(SUPPORT_CHAT_USER_ID_KEY, newSupportChatUserId);

  return newSupportChatUserId;
}

export function themeToIntercomTheme(themeMode: ThemeMode): "light" | "dark" | "system" {
  let intercomThemeMode: "light" | "dark" | "system" = "system";
  if (themeMode === "dark") {
    intercomThemeMode = "dark";
  } else if (themeMode === "light") {
    intercomThemeMode = "light";
  }
  return intercomThemeMode;
}
