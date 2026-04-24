import { i18n } from "@lingui/core";
import { messages } from "../src/locales/en/messages.po";

import "../src/styles/tailwind.css";

i18n.load("en", messages);
i18n.activate("en");
