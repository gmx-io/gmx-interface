import { t, Trans } from "@lingui/macro";
import { ChangeEvent, useCallback, useState } from "react";

import { getChainName } from "config/chains";
import { useChainId } from "lib/chains";
import { RpcDebugFlags, _debugRpcTracker } from "lib/rpc/_debug";

import Button from "components/Button/Button";
import { ExpandableRow } from "components/ExpandableRow";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";

import CloseIcon from "img/ic_close.svg?react";

const FLAG_LABELS: Record<RpcDebugFlags, string> = {
  [RpcDebugFlags.LogRpcTracker]: "Log Tracker State",
  [RpcDebugFlags.DebugLargeAccount]: "Debug Large Account",
  [RpcDebugFlags.DebugAlchemy]: "Debug Alchemy",
};

const PURPOSE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "default", label: "Default" },
  { value: "fallback", label: "Fallback" },
  { value: "largeAccount", label: "Large Account" },
  { value: "express", label: "Express" },
];

export function RpcDebugSettings() {
  const [open, setOpen] = useState(false);
  const [debugEndpointsOpen, setDebugEndpointsOpen] = useState(false);
  // eslint-disable-next-line react/hook-use-state
  const [, forceUpdate] = useState(0);
  const { chainId } = useChainId();

  const handleRemoveEndpoint = useCallback(
    (url: string) => {
      _debugRpcTracker?.removeDebugRpcEndpoint(chainId, url);
      forceUpdate((prev) => prev + 1);
    },
    [chainId]
  );

  if (!_debugRpcTracker) {
    return null;
  }

  const handleFlagChange = (flag: RpcDebugFlags, checked: boolean) => {
    _debugRpcTracker?.setFlag(flag, checked);
    forceUpdate((prev) => prev + 1);
  };

  const debugEndpoints = _debugRpcTracker.getDebugRpcEndpoints(chainId);

  return (
    <ExpandableRow title={<Trans>RPC debug</Trans>} open={open} onToggle={setOpen}>
      <div className="flex flex-col gap-16 rounded-8 bg-slate-800 p-12 pr-16">
        {Object.keys(FLAG_LABELS).map((flag) => (
          <ToggleSwitch
            key={flag}
            isChecked={_debugRpcTracker?.getFlag(flag as RpcDebugFlags) ?? false}
            setIsChecked={(checked) => handleFlagChange(flag as RpcDebugFlags, checked)}
          >
            <Trans>{FLAG_LABELS[flag]}</Trans>
          </ToggleSwitch>
        ))}

        <ExpandableRow
          title={<Trans>Debug RPC endpoints ({getChainName(chainId)})</Trans>}
          open={debugEndpointsOpen}
          onToggle={setDebugEndpointsOpen}
        >
          <div className="flex flex-col gap-16 rounded-8 bg-slate-700 p-12">
            <DebugRpcEndpointForm chainId={chainId} onUpdate={() => forceUpdate((prev) => prev + 1)} />
            {debugEndpoints.length > 0 && (
              <div className="flex flex-col gap-8">
                <div className="text-sm font-semibold text-white">
                  <Trans>Current endpoints ({debugEndpoints.length})</Trans>
                </div>
                {debugEndpoints.map((endpoint, index) => (
                  <div
                    key={index}
                    className="relative flex items-center justify-between rounded-4 bg-slate-600 p-8 pr-32"
                  >
                    <div className="flex flex-col gap-4">
                      <div className="text-xs text-white">{endpoint.url}</div>
                      <div className="text-xs text-slate-400">
                        <Trans>
                          Purpose: {endpoint.purpose} | public: {endpoint.isPublic ? t`Yes` : t`No`}
                        </Trans>
                      </div>
                    </div>
                    <button
                      className="absolute right-8 top-8 flex h-20 w-20 items-center justify-center rounded-4 text-slate-400 hover:bg-slate-500 hover:text-white"
                      onClick={() => handleRemoveEndpoint(endpoint.url)}
                      aria-label={t`Remove endpoint`}
                    >
                      <CloseIcon className="size-16" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ExpandableRow>
      </div>
    </ExpandableRow>
  );
}

function DebugRpcEndpointForm({ chainId, onUpdate }: { chainId: number; onUpdate: () => void }) {
  const [url, setUrl] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [purpose, setPurpose] = useState("default");

  const handleSubmit = useCallback(() => {
    if (!url.trim()) {
      return;
    }
    _debugRpcTracker?.setDebugRpcEndpoint(chainId, url.trim(), isPublic, purpose);
    setUrl("");
    setIsPublic(false);
    setPurpose("default");
    onUpdate();
  }, [chainId, url, isPublic, purpose, onUpdate]);

  const handleUrlChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  }, []);

  const handlePurposeChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setPurpose(e.target.value);
  }, []);

  return (
    <div className="flex flex-col gap-12">
      <div className="text-sm text-white">
        <Trans>Add RPC</Trans>
      </div>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between gap-8">
          <span className="text-xs text-slate-300">
            <Trans>URL</Trans>
          </span>
          <input
            type="text"
            value={url}
            onChange={handleUrlChange}
            className="border-1 w-[400px] border border-slate-600 bg-slate-800 px-8 py-4 text-12 text-white"
          />
        </div>
        <div className="flex items-center justify-between gap-8">
          <span className="text-xs text-slate-300">
            <Trans>Purpose</Trans>
          </span>
          <select
            value={purpose}
            onChange={handlePurposeChange}
            className="border-1 w-[400px] border border-slate-600 bg-slate-800 px-8 py-4 text-12 text-white"
          >
            {PURPOSE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between gap-8">
          <ToggleSwitch isChecked={isPublic} setIsChecked={setIsPublic}>
            <Trans>Public</Trans>
          </ToggleSwitch>
        </div>
        <div className="flex justify-end">
          <Button variant="primary" onClick={handleSubmit} disabled={!url.trim()}>
            <Trans>Add endpoint</Trans>
          </Button>
        </div>
      </div>
    </div>
  );
}
