import { useMedia } from "react-use";

export function usePoolsIsMobilePage() {
  return useMedia("(max-width: 768px)");
}
