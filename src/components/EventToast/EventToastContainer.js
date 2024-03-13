import { Toaster } from "react-hot-toast";
import { useMemo } from "react";
import { useWindowScroll, createBreakpoint } from "react-use";

const TOAST_OPTIONS = {
  duration: Infinity,
};

function EventToastContainer() {
  let { y: scrollY } = useWindowScroll();
  const useBreakpoint = createBreakpoint({ XL: 1033, L: 768, S: 350 });
  const breakpoint = useBreakpoint();
  const containerStyle = useMemo(
    () => ({
      zIndex: 801,
      transition: "all 200ms",
      top: scrollY > 60 ? "30px" : `${93 - scrollY}px`,
      right: breakpoint === "XL" ? "30px" : "1rem",
    }),
    [breakpoint, scrollY]
  );
  return (
    <Toaster
      position="top-right"
      reverseOrder={true}
      gutter={30}
      containerClassName="event-toast-container"
      containerStyle={containerStyle}
      toastOptions={TOAST_OPTIONS}
    />
  );
}
export default EventToastContainer;
