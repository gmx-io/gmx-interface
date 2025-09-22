import { GelatoRelay } from "@gelatonetwork/relay-sdk";
import noop from "lodash/noop";

export const gelatoRelay = new GelatoRelay();
gelatoRelay.onError(noop);
