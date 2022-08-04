import { Toaster } from "react-hot-toast";
import { useWindowScroll, createBreakpoint } from "react-use";

function EventToastContainer() {
  let { y: scrollY } = useWindowScroll();
  const useBreakpoint = createBreakpoint({ XL: 1033, L: 768, S: 350 });
  const breakpoint = useBreakpoint();
  return (
    <Toaster
      position="top-right"
      reverseOrder={true}
      gutter={30}
      containerClassName="event-toast-container"
      containerStyle={{
        zIndex: 2,
        transition: "all 200ms",
        top: scrollY > 60 ? "30px" : `${93 - scrollY}px`,
        right: breakpoint === "XL" ? "30px" : "1rem",
      }}
      toastOptions={{
        duration: Infinity,
      }}
    />
  );
}
export default EventToastContainer;
