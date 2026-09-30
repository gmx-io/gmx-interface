import { Trans } from "@lingui/macro";
import { ReactNode } from "react";

import { HistoryExportFormat, HistoryExportProgress } from "domain/synthetics/historyExport/utils";

import { AlertInfo } from "components/AlertInfo/AlertInfo";
import Button from "components/Button/Button";
import ModalWithPortal from "components/Modal/ModalWithPortal";
import { ProgressRow } from "components/ProgressRow/ProgressRow";

import SpinnerIcon from "img/ic_spinner.svg?react";

type ExportOption = {
  format: HistoryExportFormat;
  label: ReactNode;
};

export function HistoryExportModal({
  isVisible,
  setIsVisible,
  title,
  options,
  isGenerating,
  activeFormat,
  progress,
  error,
  onSelect,
  onCancel,
}: {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
  title: string;
  options: ExportOption[];
  isGenerating: boolean;
  activeFormat?: HistoryExportFormat;
  progress?: HistoryExportProgress;
  error?: string;
  onSelect: (format: HistoryExportFormat) => void;
  onCancel: () => void;
}) {
  const progressValue =
    progress?.totalRecords && progress.totalRecords > 0
      ? Math.min(100, Math.round((progress.loadedRecords / progress.totalRecords) * 100))
      : undefined;

  return (
    <ModalWithPortal
      isVisible={isVisible}
      setIsVisible={setIsVisible}
      label={title}
      contentClassName="w-[480px] text-13"
    >
      <div className="flex flex-col gap-12">
        <div className="flex min-h-[44px] flex-col justify-center">
          {isGenerating ? (
            <div className="flex items-end gap-8">
              <div className="min-w-0 grow">
                <ProgressRow
                  label={<Trans>Preparing export…</Trans>}
                  value={progressValue !== undefined ? `${progressValue}%` : undefined}
                  currentValue={BigInt(progress?.loadedRecords ?? 0)}
                  totalValue={progress?.totalRecords !== undefined ? BigInt(progress.totalRecords) : undefined}
                />
              </div>
              <Button variant="secondary" onClick={onCancel}>
                <Trans>Cancel</Trans>
              </Button>
            </div>
          ) : error ? (
            <AlertInfo type="warning" noMargin textColor="text-yellow-300">
              {error}
            </AlertInfo>
          ) : (
            <AlertInfo type="info" noMargin>
              <Trans>
                Exports are for record-keeping and tax-software compatibility; they do not constitute tax advice.
              </Trans>
            </AlertInfo>
          )}
        </div>

        {options.map((option) => (
          <Button
            key={option.format}
            variant="secondary"
            size="medium"
            className="w-full justify-center"
            disabled={isGenerating}
            onClick={() => onSelect(option.format)}
          >
            {isGenerating && activeFormat === option.format ? <SpinnerIcon className="size-16 animate-spin" /> : null}
            {option.label}
          </Button>
        ))}
      </div>
    </ModalWithPortal>
  );
}

export const TRADE_EXPORT_OPTIONS: ExportOption[] = [
  { format: "gmx-detailed", label: <Trans>GMX Detailed CSV</Trans> },
  { format: "koinly", label: "Koinly" },
  { format: "cointracker", label: "CoinTracker" },
  { format: "coinledger", label: "CoinLedger" },
];

export const CLAIMS_EXPORT_OPTIONS: ExportOption[] = [
  { format: "gmx-claims", label: <Trans>GMX Claims CSV</Trans> },
  { format: "koinly", label: "Koinly" },
  { format: "cointracker", label: "CoinTracker" },
  { format: "coinledger", label: <Trans>CoinLedger Margin Gain Manual CSV</Trans> },
];
