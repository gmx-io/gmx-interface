import { createSpoilerRenderer } from "landing/utils/spoilerBlur";
import { useEffect, useRef, useState } from "react";

import { renderElementToBlob } from "lib/copyElementAsImage";
import { usePrefersReducedMotion } from "lib/usePrefersReducedMotion";

export function useSpoilerBlur(blurRadius = 30) {
  const sourceRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [ready, setReady] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const source = sourceRef.current;
    const canvas = canvasRef.current;
    if (!source || !canvas) return;
    setReady(false);
    const renderer = createSpoilerRenderer(canvas, blurRadius);
    if (!renderer) return;

    let disposed = false;
    let visible = false;
    let hasImage = false;
    let dirty = true;
    let capturing = false;
    let animationFrame = 0;
    let captureTimeout = 0;
    const start = performance.now();

    function animate(now: number) {
      animationFrame = 0;
      if (disposed || !visible || document.hidden || !hasImage) return;
      renderer!.draw(reducedMotion ? 0 : (now - start) / 1000);
      if (!reducedMotion) animationFrame = requestAnimationFrame(animate);
    }

    function resume() {
      cancelAnimationFrame(animationFrame);
      animate(performance.now());
    }

    async function capture() {
      if (disposed || !visible || document.hidden || capturing || !dirty) return;
      const { width, height } = source!.getBoundingClientRect();
      if (!width || !height) return;
      capturing = true;
      dirty = false;
      try {
        const blob = await renderElementToBlob(source!, {
          type: "image/png",
          pixelRatio: 1,
          style: { filter: "none", opacity: "1", visibility: "visible" },
        });
        if (disposed) return;
        const url = URL.createObjectURL(blob);
        try {
          const image = new Image();
          image.src = url;
          await image.decode();
          if (disposed) return;
          renderer!.update(image, width, height);
          hasImage = true;
          setReady(true);
          resume();
        } finally {
          URL.revokeObjectURL(url);
        }
      } catch (_error) {
        // Keep the CSS mask if image capture or the graphics context is unavailable.
      } finally {
        capturing = false;
        if (dirty && !disposed) scheduleCapture();
      }
    }

    function scheduleCapture() {
      dirty = true;
      window.clearTimeout(captureTimeout);
      captureTimeout = window.setTimeout(() => void capture(), 100);
    }

    const resizeObserver = new ResizeObserver(scheduleCapture);
    resizeObserver.observe(source);
    const mutationObserver = new MutationObserver(scheduleCapture);
    mutationObserver.observe(source, { childList: true, characterData: true, subtree: true });
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && dirty) void capture();
      resume();
    });
    intersectionObserver.observe(canvas);

    function visibilityChanged() {
      if (!document.hidden && dirty) void capture();
      resume();
    }
    function contextLost(event: Event) {
      event.preventDefault();
      hasImage = false;
      setReady(false);
      cancelAnimationFrame(animationFrame);
    }
    const contextRestored = () => setRevision((value) => value + 1);
    document.addEventListener("visibilitychange", visibilityChanged);
    canvas.addEventListener("webglcontextlost", contextLost);
    canvas.addEventListener("webglcontextrestored", contextRestored);

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      window.clearTimeout(captureTimeout);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", visibilityChanged);
      canvas.removeEventListener("webglcontextlost", contextLost);
      canvas.removeEventListener("webglcontextrestored", contextRestored);
      renderer.destroy();
    };
  }, [blurRadius, reducedMotion, revision]);

  return { sourceRef, canvasRef, ready };
}
