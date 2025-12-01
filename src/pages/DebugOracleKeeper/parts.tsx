import { emitReportEndpointFailure } from "lib/FallbackTracker/events";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher";
import type { OracleKeeperDebugEvent, OracleKeeperDebugState } from "lib/oracleKeeperFetcher/_debug";
import { OracleKeeperDebugFlags } from "lib/oracleKeeperFetcher/_debug";

import Button from "components/Button/Button";
import { Table, TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";

export type OracleEndpointStats = {
  endpoint: string;
  success: boolean;
  responseTime: number | undefined;
  bannedTimestamp: number | undefined;
  failureCount: number;
  isPrimary: boolean;
  isSecondary: boolean;
};

const formatEventType = (type: string) => {
  return type.replace(/-/g, " ");
};

const getEventColor = (type: string) => {
  if (type.includes("success")) return "text-green-500";
  if (type.includes("failed")) return "text-red-500";
  if (type.includes("partial")) return "text-orange-500";
  if (type.includes("start")) return "text-blue-500";
  if (type.includes("banned")) return "text-purple-500";
  if (type.includes("updated") || type.includes("finished")) return "text-cyan-500";
  return "text-gray-500";
};

export function OracleEndpointsTable({ allEndpointStats }: { allEndpointStats: OracleEndpointStats[] }) {
  return (
    <div className="flex max-h-[450px] min-h-0 flex-shrink-0 flex-col overflow-hidden">
      <div className="mb-6 flex h-8 flex-shrink-0 items-center justify-between px-8 py-16">
        <h3 className="text-xl muted font-bold uppercase">Oracle Endpoints</h3>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="overflow-x-auto">
          <Table>
            <thead className="sticky top-0 z-10 bg-slate-900">
              <TableTheadTr>
                <TableTh padding="compact">Endpoint</TableTh>
                <TableTh padding="compact">Status</TableTh>
                <TableTh padding="compact">Failures</TableTh>
                <TableTh padding="compact">Banned</TableTh>
                <TableTh padding="compact">Response Time</TableTh>
              </TableTheadTr>
            </thead>
            <tbody>
              {allEndpointStats.map((endpoint) => (
                <TableTr key={endpoint.endpoint}>
                  <TableTd padding="compact">
                    <div className="text-sm font-semibold text-white">{endpoint.endpoint}</div>
                  </TableTd>
                  <TableTd padding="compact">
                    <div className="text-xs flex flex-wrap gap-1">
                      {endpoint.isPrimary && <span className="text-green-400">Primary</span>}
                      {endpoint.isSecondary && <span className="text-yellow-300">Secondary</span>}
                    </div>
                  </TableTd>
                  <TableTd padding="compact">
                    <span className="text-orange-500 text-sm font-semibold">{endpoint.failureCount}</span>
                  </TableTd>
                  <TableTd padding="compact">
                    {endpoint.bannedTimestamp ? (
                      <span className="text-xs font-semibold text-red-500">
                        {new Date(endpoint.bannedTimestamp).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: false,
                        })}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">—</span>
                    )}
                  </TableTd>
                  <TableTd padding="compact">
                    {endpoint.responseTime !== undefined ? (
                      <span className="text-xs text-white">{endpoint.responseTime}ms</span>
                    ) : (
                      <span className="text-xs text-gray-500">—</span>
                    )}
                  </TableTd>
                </TableTr>
              ))}
            </tbody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export function EventsPanel({
  events,
  onClearEvents,
}: {
  events: OracleKeeperDebugEvent[];
  onClearEvents: () => void;
}) {
  return (
    <div className="flex min-h-0 min-w-[320px] flex-col overflow-hidden">
      <div className="mb-6 flex h-8 flex-shrink-0 items-center justify-between px-8 py-16">
        <h3 className="text-xl muted font-bold uppercase">Oracle Keeper Events</h3>
        <Button variant="secondary" onClick={onClearEvents}>
          Clear Events
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {events.length === 0 ? (
          <Table>
            <tbody>
              <TableTr>
                <TableTd padding="compact">
                  <div className="text-sm font-semibold">No events</div>
                </TableTd>
              </TableTr>
            </tbody>
          </Table>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead className="sticky top-0 z-10 bg-slate-900">
                <TableTheadTr>
                  <TableTh padding="compact" className="text-left">
                    Event
                  </TableTh>
                </TableTheadTr>
              </thead>
              <tbody>
                {events.map((event, index) => {
                  return (
                    <TableTr key={index}>
                      <TableTd padding="compact">
                        <div className="flex flex-col items-start gap-2">
                          <div className={`text-xs font-semibold ${getEventColor(event.type)}`}>
                            {formatEventType(event.type)}
                          </div>
                          {event.endpoint && <div className="text-xs text-gray-500">{event.endpoint}</div>}
                          {event.error && <div className="text-xs text-red-500">{event.error.message}</div>}
                          {event.data && (
                            <div className="text-xs text-gray-400">{JSON.stringify(event.data, null, 2)}</div>
                          )}
                        </div>
                      </TableTd>
                    </TableTr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

export function DebugControlsPanel({
  chainId,
  primaryEndpoint,
  secondaryEndpoint,
  debugState,
  onDebugFlagChange,
}: {
  chainId: number;
  primaryEndpoint: string | undefined;
  secondaryEndpoint: string | undefined;
  debugState: Partial<OracleKeeperDebugState>;
  onDebugFlagChange: <K extends keyof OracleKeeperDebugState>(flag: K, value: boolean) => void;
}) {
  const fetcher = useOracleKeeperFetcher(chainId as any);

  return (
    <div className="flex min-h-0 flex-col overflow-hidden">
      <div className="mb-6 flex h-8 flex-shrink-0 items-center px-8 py-16">
        <h3 className="text-xl muted font-bold uppercase">Debug Controls</h3>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="overflow-x-auto">
          <Table>
            <tbody>
              <TableTr>
                <TableTd padding="compact" colSpan={2}>
                  <div className="py-6">
                    <div className="text-base mb-6 font-semibold text-gray-400">Force Failures</div>
                    <div className="space-y-4">
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() => {
                          if (!primaryEndpoint) {
                            return;
                          }
                          const fetcherInstance = fetcher as any;
                          emitReportEndpointFailure({
                            endpoint: primaryEndpoint,
                            trackerKey: fetcherInstance.oracleTracker?.fallbackTracker?.trackerKey ?? "unknown",
                          });
                        }}
                      >
                        Force Primary Failure
                      </Button>
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() => {
                          if (!secondaryEndpoint) {
                            return;
                          }
                          const fetcherInstance = fetcher as any;
                          emitReportEndpointFailure({
                            endpoint: secondaryEndpoint,
                            trackerKey: fetcherInstance.oracleTracker?.fallbackTracker?.trackerKey ?? "unknown",
                          });
                        }}
                      >
                        Force Secondary Failure
                      </Button>
                    </div>
                  </div>
                </TableTd>
              </TableTr>
              <TableTr>
                <TableTd padding="compact" colSpan={2}>
                  <div className="py-6">
                    <div className="text-base mb-6 font-semibold text-gray-400">Tickers Simulation</div>
                    <div className="space-y-6">
                      <ToggleSwitch
                        isChecked={debugState.triggerTickersFailure ?? false}
                        setIsChecked={(checked) =>
                          onDebugFlagChange(OracleKeeperDebugFlags.TriggerTickersFailure, checked)
                        }
                        textClassName="text-base text-white"
                      >
                        Trigger tickers failure
                      </ToggleSwitch>
                      <ToggleSwitch
                        isChecked={debugState.triggerPartialTickers ?? false}
                        setIsChecked={(checked) =>
                          onDebugFlagChange(OracleKeeperDebugFlags.TriggerPartialTickers, checked)
                        }
                        textClassName="text-base text-white"
                      >
                        Trigger partial tickers
                      </ToggleSwitch>
                    </div>
                  </div>
                </TableTd>
              </TableTr>
            </tbody>
          </Table>
        </div>
      </div>
    </div>
  );
}
