import { forwardRef } from "react";

/**
 * This is needed because Fragment logs errors when passed props
 */
export const NoopWrapper = forwardRef<HTMLDivElement, { children: React.ReactNode }>(({ children }) => <>{children}</>);
