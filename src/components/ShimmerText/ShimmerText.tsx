import "./ShimmerText.scss";

export function ShimmerText({ children }: { children: React.ReactNode }) {
  return <span className="shimmer-text">{children}</span>;
}
