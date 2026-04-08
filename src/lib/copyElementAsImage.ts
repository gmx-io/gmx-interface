import { t } from "@lingui/macro";
import type { toBlob } from "html-to-image";

import { helperToast } from "lib/helperToast";
import { emitMetricEvent } from "lib/metrics/emitMetricEvent";
import type { ImageExportError } from "lib/metrics/types";

type Options = NonNullable<Parameters<typeof toBlob>[1]>;

async function renderElementToBlob(element: HTMLElement, extraOptions?: Options): Promise<Blob> {
  const { toBlob } = await import("html-to-image");
  const options = { quality: 1, pixelRatio: 2, ...extraOptions };

  // Render repeatedly until the output stabilizes (same blob size across calls).
  // Safari may not load all resources (images, fonts) on the first render pass.
  let previousSize = 0;
  for (let i = 0; i < 5; i++) {
    const blob = await toBlob(element, options);
    if (blob && blob.size === previousSize) {
      return blob;
    }
    previousSize = blob?.size ?? 0;
  }

  const blob = await toBlob(element, options);

  if (!blob) {
    throw new Error("Failed to render image");
  }

  return blob;
}

export async function copyElementAsImage(element: HTMLElement, extraOptions?: Options): Promise<void> {
  // Pass the blob as a Promise so clipboard.write() is called synchronously
  // within the user gesture — Safari revokes clipboard permission if an async
  // operation separates the gesture from the write call.
  await navigator.clipboard.write([new ClipboardItem({ "image/png": renderElementToBlob(element, extraOptions) })]);
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 1000);
}

export async function shareOrCopyElementAsImage({
  element,
  isMobile,
  fileName,
  extraOptions,
}: {
  element: HTMLElement;
  isMobile: boolean;
  fileName: string;
  extraOptions?: Options;
}): Promise<void> {
  try {
    if (isMobile) {
      const blob = await renderElementToBlob(element, extraOptions);
      const file = new File([blob], fileName, { type: "image/png" });

      // Android WebView (MetaMask, Trust Wallet, etc.) doesn't support Web Share API
      const canShare = typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });

      if (canShare) {
        await navigator.share({ files: [file] });
      } else {
        downloadBlob(blob, fileName);
        helperToast.success(t`Image downloaded`);
      }
    } else {
      await copyElementAsImage(element, extraOptions);
      helperToast.success(t`Image copied to clipboard`);
    }
  } catch (error) {
    // AbortError means user canceled the share dialog — not an error
    if (error instanceof DOMException && error.name === "AbortError") {
      return;
    }
    helperToast.error(t`Failed to export image`);
    emitMetricEvent<ImageExportError>({
      event: "error.imageExport",
      isError: true,
      data: { errorMessage: error instanceof Error ? error.message : String(error) },
    });
  }
}
