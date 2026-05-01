import { i18n } from "@lingui/core";
import { messages } from "../src/locales/en/messages.po";

import "../src/styles/tailwind.css";
import "../src/styles/Font.css";
import "../src/styles/Input.css";
import "../src/styles/Shared.scss";
import "../src/styles/recharts.css";
import "../src/styles/DeprecatedExchageStyles.scss";
import "../src/App/App.scss";

i18n.load("en", messages);
i18n.activate("en");
