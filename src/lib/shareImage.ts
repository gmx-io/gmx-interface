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

export function getShareURL(imageId: string, ref?: string): string {
  let url = `${SHARE_URL}?id=${imageId}`;
  if (ref) {
    url += `&ref=${ref}`;
  }
  return url;
}

export async function uploadElementAsShareImage(element: HTMLElement): Promise<UploadedImageInfo> {
  try {
    const blob = await renderElementToBlob(element, UPLOAD_IMAGE_OPTIONS);

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
