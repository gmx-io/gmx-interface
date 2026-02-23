import { createGelatoEvmRelayerClient, type GelatoEvmRelayerClient } from "@gelatocloud/gasless";

export { StatusCode } from "@gelatocloud/gasless";
export type { TerminalStatus, Status, GelatoEvmRelayerClient } from "@gelatocloud/gasless";

let _relayerClients: Map<string, GelatoEvmRelayerClient> = new Map();

export function getGelatoRelayerClient(apiKey: string): GelatoEvmRelayerClient {
  let client = _relayerClients.get(apiKey);
  if (!client) {
    client = createGelatoEvmRelayerClient({ apiKey });
    _relayerClients.set(apiKey, client);
  }
  return client;
}
