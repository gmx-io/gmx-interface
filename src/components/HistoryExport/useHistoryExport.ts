import { t } from "@lingui/macro";
import { useCallback, useEffect, useRef, useState } from "react";

import { HistoryExportFormat, HistoryExportProgress } from "domain/synthetics/historyExport/utils";

export function useHistoryExport({
  generate,
}: {
  generate: (
    format: HistoryExportFormat,
    signal: AbortSignal,
    onProgress: (progress: HistoryExportProgress) => void
  ) => Promise<void>;
}) {
  const abortControllerRef = useRef<AbortController>();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeFormat, setActiveFormat] = useState<HistoryExportFormat>();
  const [error, setError] = useState<string>();
  const [progress, setProgress] = useState<HistoryExportProgress>();

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = undefined;
    setIsGenerating(false);
    setActiveFormat(undefined);
    setProgress(undefined);
  }, []);

  const setModalVisible = useCallback(
    (isVisible: boolean) => {
      if (!isVisible) {
        cancel();
      }
      setError(undefined);
      setIsModalVisible(isVisible);
    },
    [cancel]
  );

  const start = useCallback(
    async (format: HistoryExportFormat) => {
      cancel();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      setError(undefined);
      setProgress(undefined);
      setActiveFormat(format);
      setIsGenerating(true);

      try {
        await generate(format, abortController.signal, setProgress);
        if (!abortController.signal.aborted) {
          setIsModalVisible(false);
        }
      } catch (error) {
        if (abortController.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) {
          return;
        }
        setError(t`The export could not be completed. No file was downloaded.`);
      } finally {
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = undefined;
          setIsGenerating(false);
          setActiveFormat(undefined);
          setProgress(undefined);
        }
      }
    },
    [cancel, generate]
  );

  useEffect(() => cancel, [cancel]);

  return {
    activeFormat,
    cancel,
    error,
    isGenerating,
    isModalVisible,
    progress,
    setIsModalVisible: setModalVisible,
    start,
  };
}
