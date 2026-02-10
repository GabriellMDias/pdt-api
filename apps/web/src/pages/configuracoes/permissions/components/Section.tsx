import React from "react";

type Props = {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
};

export default function Section({ title, right, children }: Props) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-pilar-default-bg2-dark/80">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="m-0 text-base font-semibold text-neutral-800 dark:text-neutral-100">{title}</h3>
        <div className="flex gap-2">{right}</div>
      </div>
      {children}
    </section>
  );
}
