import { renderElementToBlob } from "lib/copyElementAsImage";
import { getRootShareApiUrl } from "lib/legacy";
import { metrics } from "lib/metrics";

const ROOT_SHARE_URL = getRootShareApiUrl();
const UPLOAD_URL = ROOT_SHARE_URL + "/api/upload";
const SHARE_URL = ROOT_SHARE_URL + "/api/s";

const UPLOAD_IMAGE_OPTIONS = { quality: 0.95, canvasWidth: 460, canvasHeight: 240 };

export type UploadedImageInfo = {
  id: string;
};

export function getShareURL(imageId: string, ref?: string, page?: "rewards"): string {
  const params = new URLSearchParams({ id: imageId });
  if (ref) {
    params.set("ref", ref);
  }
  if (page) {
    params.set("page", page);
  }
  return `${SHARE_URL}?${params}`;
}

export async function uploadElementAsShareImage(
  element: HTMLElement,
  extraOptions?: Parameters<typeof renderElementToBlob>[1]
): Promise<UploadedImageInfo> {
  try {
    const blob = await renderElementToBlob(element, { ...UPLOAD_IMAGE_OPTIONS, ...extraOptions });

    const res = await fetch(UPLOAD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: blob,
    });

    if (!res.ok) {
      throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
    }

    const imageInfo = await res.json();

    if (!imageInfo?.id) {
      throw new Error("Image upload failed: no id returned");
    }

    return imageInfo as UploadedImageInfo;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Share image upload failed", error);
    metrics.pushError(error, "shareImage.upload");
    throw error;
  }
}
