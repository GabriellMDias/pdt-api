import React from "react";

type Props = {
  tone?: "neutral" | "success" | "danger" | "info";
  children: React.ReactNode;
};

export default function Badge({ tone = "neutral", children }: Props) {
  const toneClass =
    tone === "success"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200"
      : tone === "danger"
        ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200"
        : tone === "info"
          ? "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-200"
          : "border-neutral-300 bg-neutral-100 text-neutral-700 dark:border-white/15 dark:bg-white/10 dark:text-neutral-200";
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${toneClass}`}
    >
      {children}
    </span>
  );
}
