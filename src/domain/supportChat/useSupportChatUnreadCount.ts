import { createGlobalState } from "react-use";

export const useSupportChatUnreadCount = createGlobalState<number>(0);
