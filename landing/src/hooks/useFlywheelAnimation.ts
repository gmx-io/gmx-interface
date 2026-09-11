import { useEffect, useRef } from "react";

const CYCLE_DURATION = 8_000;

export function useFlywheelAnimation() {
  const flywheelRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGRectElement>(null);
  const gradientRef = useRef<SVGRadialGradientElement>(null);

  useEffect(() => {
    const flywheel = flywheelRef.current;
    const path = pathRef.current;
    const gradient = gradientRef.current;
    const track = path?.ownerSVGElement;
    if (!flywheel || !path || !gradient || !track) return;

    const nodes = Array.from(flywheel.querySelectorAll<HTMLElement>("[data-flywheel-node]"));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frameId: number | undefined;
    let lastTime: number | undefined;
    let elapsed = 0;
    let isVisible = false;
    let length = 0;
    let trackX = 0;
    let trackY = 0;

    function paint() {
      if (!length) return;
      const point = path!.getPointAtLength(((elapsed % CYCLE_DURATION) / CYCLE_DURATION) * length);
      gradient!.setAttribute("cx", String(point.x));
      gradient!.setAttribute("cy", String(point.y));
      flywheel!.style.setProperty("--rewards-light-x", `${trackX + point.x}px`);
      flywheel!.style.setProperty("--rewards-light-y", `${trackY + point.y}px`);
    }

    function animate(time: number) {
      if (lastTime !== undefined) elapsed += time - lastTime;
      lastTime = time;
      paint();
      frameId = requestAnimationFrame(animate);
    }

    function updateAnimation() {
      if (frameId !== undefined) cancelAnimationFrame(frameId);
      frameId = undefined;
      lastTime = undefined;
      if (isVisible && !reducedMotion.matches) frameId = requestAnimationFrame(animate);
    }

    function measure() {
      const bounds = flywheel!.getBoundingClientRect();
      const trackBounds = track!.getBoundingClientRect();
      length = path!.getTotalLength();
      trackX = trackBounds.left - bounds.left;
      trackY = trackBounds.top - bounds.top;
      gradient!.setAttribute("r", String(Math.min(200, length * 0.085)));
      for (const node of nodes) {
        const nodeBounds = node.getBoundingClientRect();
        node.style.setProperty("--rewards-node-x", `${nodeBounds.left - bounds.left}px`);
        node.style.setProperty("--rewards-node-y", `${nodeBounds.top - bounds.top}px`);
      }
      paint();
    }

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(flywheel);
    resizeObserver.observe(track);
    nodes.forEach((node) => resizeObserver.observe(node));

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      updateAnimation();
    });
    intersectionObserver.observe(flywheel);
    reducedMotion.addEventListener("change", updateAnimation);
    measure();

    return () => {
      if (frameId !== undefined) cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      reducedMotion.removeEventListener("change", updateAnimation);
    };
  }, []);

  return { flywheelRef, pathRef, gradientRef };
}
