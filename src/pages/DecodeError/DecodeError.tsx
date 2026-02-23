import { t, Trans } from "@lingui/macro";
import { useMemo, useState } from "react";
import { Abi, decodeErrorResult, getAbiItem } from "viem";

import { StargateErrorsAbi } from "config/multichain";
import { abis } from "sdk/abis";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import PageTitle from "components/PageTitle/PageTitle";

type DecodedError = {
  errorName: string;
  args?: unknown;
  source: "CustomErrors" | "StargateErrors";
  abi: Abi;
};

function decodeError(hexData: string): DecodedError | null {
  if (!hexData.startsWith("0x")) {
    return null;
  }

  try {
    const abi = abis.CustomErrors as Abi;
    const decoded = decodeErrorResult({
      abi,
      data: hexData,
    });
    return {
      errorName: decoded.errorName,
      args: decoded.args,
      source: "CustomErrors",
      abi,
    };
  } catch (err) {
    try {
      const abi = StargateErrorsAbi;
      const decoded = decodeErrorResult({
        abi,
        data: hexData,
      });
      return {
        errorName: decoded.errorName,
        args: decoded.args,
        source: "StargateErrors",
        abi,
      };
    } catch (err2) {
      return null;
    }
  }
}

export function DecodeError() {
  const [hexInput, setHexInput] = useState("");

  const decodedError = useMemo(() => {
    if (!hexInput.trim()) {
      return null;
    }
    return decodeError(hexInput.trim());
  }, [hexInput]);

  const formatArgs = (args: unknown, errorName: string, abi: Abi) => {
    if (!args) {
      return null;
    }

    const formatValue = (value: unknown): string => {
      if (typeof value === "bigint") {
        return value.toString();
      }
      if (typeof value === "object" && value !== null) {
        return JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2);
      }
      return String(value);
    };

    if (Array.isArray(args)) {
      try {
        const errorItem = getAbiItem({ abi, name: errorName });
        if (errorItem && "inputs" in errorItem && errorItem.inputs) {
          return args.map((value, index) => {
            const paramName = errorItem.inputs[index]?.name || `arg${index}`;
            return {
              key: paramName,
              value: formatValue(value),
            };
          });
        }
      } catch (err) {
        // fallback to generic names
      }
      return args.map((value, index) => ({
        key: `arg${index}`,
        value: formatValue(value),
      }));
    }

    if (typeof args === "object") {
      const entries = Object.entries(args);
      if (entries.length === 0) {
        return null;
      }
      return entries.map(([key, value]) => ({
        key,
        value: formatValue(value),
      }));
    }

    return null;
  };

  const formattedArgs = decodedError ? formatArgs(decodedError.args, decodedError.errorName, decodedError.abi) : null;

  return (
    <AppPageLayout title="Decode Error">
      <div className="default-container page-layout">
        <PageTitle
          title={t`Decode error`}
          className="p-12"
          subtitle={
            <div className="text-body-medium mb-20">
              <Trans>Paste hex error data to decode</Trans>
            </div>
          }
        />

        <div className="mb-20">
          <div className="text-body-medium mb-8">
            <Trans>Error data (hex)</Trans>
          </div>
          <textarea
            value={hexInput}
            onChange={(e) => setHexInput(e.target.value)}
            placeholder={t`0x...`}
            className="min-h-96 w-full resize-y appearance-none border-none p-15 text-typography-primary text-input-bg focus:outline-none focus:ring-0"
          />
        </div>

        {decodedError && (
          <div className="mb-20 rounded-8 border border-slate-800 bg-slate-900 p-20">
            <div className="text-body-medium mb-12">
              <span className="font-medium">
                <Trans>Error name:</Trans>
              </span>{" "}
              <span className="text-blue-400">{decodedError.errorName}</span>
            </div>
            <div className="text-body-medium mb-12">
              <span className="font-medium">
                <Trans>Source:</Trans>
              </span>{" "}
              <span className={decodedError.source === "CustomErrors" ? "text-green-400" : "text-purple-400"}>
                {decodedError.source}
              </span>
            </div>
            {formattedArgs && formattedArgs.length > 0 && (
              <div>
                <div className="text-body-medium mb-8 font-medium">
                  <Trans>Arguments</Trans>
                </div>
                <div className="space-y-8">
                  {formattedArgs.map(({ key, value }) => (
                    <div key={key} className="rounded-4 bg-slate-800 p-12">
                      <div className="mb-4 text-12 font-medium text-typography-secondary">{key}:</div>
                      <div className="break-all font-mono text-12 text-typography-primary">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {hexInput.trim() && !decodedError && (
          <div className="mb-20 rounded-8 border border-red-500/50 bg-red-500/10 p-20">
            <div className="text-body-medium text-red-400">
              <Trans>Failed to decode error. Make sure the hex data is valid and starts with "0x".</Trans>
            </div>
          </div>
        )}

        {!hexInput.trim() && (
          <div className="mb-20 rounded-8 border border-slate-800 bg-slate-900 p-20">
            <div className="text-body-medium text-typography-secondary">
              <Trans>Enter hex error data above to decode it</Trans>
            </div>
          </div>
        )}
      </div>
    </AppPageLayout>
  );
}
