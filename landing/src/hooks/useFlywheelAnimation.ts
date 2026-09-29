import { useEffect, useRef } from "react";

const CYCLE_DURATION = 8_000;

export function useFlywheelAnimation() {
  const flywheelRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const gradientRef = useRef<SVGRadialGradientElement>(null);

  useEffect(() => {
    const flywheel = flywheelRef.current;
    const track = trackRef.current;
    const gradient = gradientRef.current;
    if (!flywheel || !track || !gradient) return;

    const nodes = Array.from(flywheel.querySelectorAll<HTMLElement>("[data-flywheel-node]"));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frameId: number | undefined;
    let lastTime: number | undefined;
    let elapsed = 0;
    let isVisible = false;
    let radius = 0;
    let centerX = 0;
    let centerY = 0;

    function paint() {
      const progress = (elapsed % CYCLE_DURATION) / CYCLE_DURATION;
      const angle = progress * Math.PI * 2;
      gradient!.setAttribute("gradientTransform", `rotate(${progress * 360} 0.5 0.5)`);
      flywheel!.style.setProperty("--rewards-light-x", `${centerX + Math.cos(angle) * radius}px`);
      flywheel!.style.setProperty("--rewards-light-y", `${centerY + Math.sin(angle) * radius}px`);
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
      if (reducedMotion.matches) {
        elapsed = 0;
        paint();
      } else if (isVisible && !document.hidden) {
        frameId = requestAnimationFrame(animate);
      }
    }

    function measure() {
      const bounds = flywheel!.getBoundingClientRect();
      const trackBounds = track!.getBoundingClientRect();
      radius = trackBounds.width / 2;
      centerX = trackBounds.left - bounds.left + radius;
      centerY = trackBounds.top - bounds.top + radius;
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
    document.addEventListener("visibilitychange", updateAnimation);
    measure();

    return () => {
      if (frameId !== undefined) cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      reducedMotion.removeEventListener("change", updateAnimation);
      document.removeEventListener("visibilitychange", updateAnimation);
    };
  }, []);

  return { flywheelRef, trackRef, gradientRef };
}
