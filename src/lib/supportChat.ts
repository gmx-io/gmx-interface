import Intercom from "@intercom/messenger-js-sdk";
import { useEffect } from "react";

const INTERCOM_APP_ID = "blsw8a15";

export function useSupportChat() {
  useEffect(() => {
    Intercom({
      app_id: INTERCOM_APP_ID,
    });
  }, []);
}
