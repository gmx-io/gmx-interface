import { PropsWithChildren } from "react";

export default function HorizontalScrollCard({
  children,
}: PropsWithChildren<{
  // upToBreakpoint?: "sm" | "md" | "lg";
}>) {
  return (
    <div
      className="App-box
                 max-sm:!-mr-[--default-container-padding-mobile]
                 max-sm:!rounded-r-0
                 sm:max-lg:-mr-[--default-container-padding]
                 sm:max-lg:rounded-r-0"
    >
      {children}
    </div>
  );
}
