import { act, cleanup, render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useShareCardActions } from "./useShareCardActions";

const mocks = vi.hoisted(() => ({
  getTwitterIntentURL: vi.fn((text: string, url?: string) =>
    url ? `https://twitter.com/intent/tweet?text=${text}&url=${url}` : `https://twitter.com/intent/tweet?text=${text}`
  ),
  popupReplace: vi.fn(),
  uploadElementAsShareImage: vi.fn(),
}));

vi.mock("lib/copyElementAsImage", () => ({
  shareOrCopyElementAsImage: vi.fn(),
}));

vi.mock("lib/helperToast", () => ({
  helperToast: { success: vi.fn() },
}));

vi.mock("lib/legacy", () => ({
  getTwitterIntentURL: mocks.getTwitterIntentURL,
}));

vi.mock("lib/shareImage", () => ({
  getShareURL: (imageId: string) => `https://share.example/${imageId}`,
  uploadElementAsShareImage: mocks.uploadElementAsShareImage,
}));

vi.mock("lib/useBreakpoints", () => ({
  useBreakpoints: () => ({ isMobile: false }),
}));

vi.mock("lib/userAnalytics", () => ({
  userAnalytics: { pushEvent: vi.fn() },
}));

vi.mock("react-use", () => ({
  useCopyToClipboard: () => [undefined, vi.fn()],
}));

type Actions = ReturnType<typeof useShareCardActions>;

function Harness({ actionsRef }: { actionsRef: { current: Actions | null } }) {
  const cardRef = useRef<HTMLDivElement>(null);
  actionsRef.current = useShareCardActions({
    cardRef,
    shareAffiliateCode: { code: null, success: true },
    source: "account-dashboard",
    fileName: "share.png",
    tweetText: "Trading performance on @GMX_IO",
  });

  return <div ref={cardRef} />;
}

function setup() {
  // The mutable ref exposes hook actions to the test.
  // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
  const actionsRef: { current: Actions | null } = { current: null };
  const popup = {
    opener: window,
    location: { replace: mocks.popupReplace },
  } as unknown as Window;
  const open = vi.spyOn(window, "open").mockReturnValue(popup);

  render(<Harness actionsRef={actionsRef} />);

  return { actionsRef, open, popup };
}

describe("useShareCardActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("reserves a tab before upload and navigates it to the image share intent", async () => {
    let resolveUpload!: (value: { id: string }) => void;
    mocks.uploadElementAsShareImage.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveUpload = resolve;
      })
    );
    const { actionsRef, open, popup } = setup();

    let sharePromise!: Promise<void>;
    act(() => {
      sharePromise = actionsRef.current!.handleShareTwitter();
    });

    expect(open).toHaveBeenCalledWith("about:blank", "_blank");
    expect(popup.opener).toBeNull();
    expect(mocks.popupReplace).not.toHaveBeenCalled();

    resolveUpload({ id: "image-id" });
    await act(async () => sharePromise);

    expect(mocks.getTwitterIntentURL).toHaveBeenCalledWith(
      "Trading performance on @GMX_IO",
      "https://share.example/image-id"
    );
    expect(mocks.popupReplace).toHaveBeenCalledWith(
      "https://twitter.com/intent/tweet?text=Trading performance on @GMX_IO&url=https://share.example/image-id"
    );
  });

  it("navigates the reserved tab to a text-only intent when upload fails", async () => {
    mocks.uploadElementAsShareImage.mockRejectedValueOnce(new Error("upload failed"));
    const { actionsRef, open } = setup();

    await act(async () => actionsRef.current!.handleShareTwitter());

    expect(open).toHaveBeenCalledTimes(1);
    expect(mocks.getTwitterIntentURL).toHaveBeenCalledWith("Trading performance on @GMX_IO", undefined);
    expect(mocks.popupReplace).toHaveBeenCalledWith(
      "https://twitter.com/intent/tweet?text=Trading performance on @GMX_IO"
    );
  });
});
