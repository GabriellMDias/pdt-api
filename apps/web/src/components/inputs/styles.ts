export const fieldLabelClass =
  "mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300";

export const fieldHintClass =
  "mt-1 block text-xs text-neutral-500 dark:text-neutral-400";

export const fieldControlBaseClass = [
  "w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm",
  "placeholder:text-neutral-400",
  "transition-colors duration-150",
  "focus:outline-none focus:ring-2 focus:ring-pilar-green/35 focus:border-pilar-green",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "dark:border-neutral-600 dark:bg-pilar-default-bg-dark dark:text-neutral-100 dark:placeholder:text-neutral-500",
].join(" ");

export const fieldControlInteractiveClass = [
  fieldControlBaseClass,
  "cursor-pointer hover:border-neutral-400 dark:hover:border-neutral-500",
].join(" ");

export const fieldMenuSurfaceClass = [
  "rounded-xl border border-neutral-200 bg-white text-neutral-900 shadow-lg",
  "dark:border-neutral-700 dark:bg-pilar-default-bg-dark dark:text-neutral-100",
].join(" ");
