import { ConnectWalletClickEvent } from "lib/userAnalytics/types";
import { userAnalytics } from "lib/userAnalytics";

export function pushConnectWalletClickEvent(position: ConnectWalletClickEvent["data"]["position"]) {
  userAnalytics.pushEvent<ConnectWalletClickEvent>({
    event: "ConnectWalletAction",
    data: {
      action: "ConnectWalletClick",
      position,
    },
  });
}
