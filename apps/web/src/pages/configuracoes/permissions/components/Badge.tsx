import React from "react";

type Props = {
  tone?: "neutral" | "success" | "danger" | "info";
  children: React.ReactNode;
};

export default function Badge({ tone = "neutral", children }: Props) {
  const bg =
    tone === "success" ? "var(--color-pilar-green)"
    : tone === "danger" ? "var(--color-pilar-orange)"
    : tone === "info" ? "var(--color-pilar-green)"
    : "rgba(255,255,255,0.10)";

  const color = "#e5e7eb";
  return (
    <span style={{ background: bg, color, padding: "4px 8px", borderRadius: 999, fontSize: 12, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}