import React from "react";

export function IconButton({
  children,
  onClick,
  title,
  variant = "default",
  disabled,
  type = "button",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  variant?: "green" | "default" | "primary" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl border p-2 text-sm shadow-sm transition-colors duration-150 hover:shadow disabled:cursor-not-allowed disabled:opacity-50";
  const styles = {
    default:
      "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700",
    primary:
      "border-blue-600 bg-blue-600 text-white hover:bg-blue-500 dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500",
    danger:
      "border-red-600 bg-red-600 text-white hover:bg-red-500 dark:border-red-500 dark:bg-red-600 dark:hover:bg-red-500",
    green:
      "border-green-600 bg-green-600 text-white hover:bg-green-500 dark:border-green-500 dark:bg-green-600 dark:hover:bg-green-500"
  } as const;
  return (
    <button
      className={`${base} ${styles[variant]} ${disabled ? "" : "cursor-pointer"} ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      type={type}
    >
      {children}
    </button>
  );
}

export function ConfirmDialog({
  open,
  title = "Confirmar ação",
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative z-[101] w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
        <h3 className="mb-2 text-lg font-semibold text-neutral-800 dark:text-neutral-100">{title}</h3>
        <p className="mb-5 text-neutral-600 dark:text-neutral-300">{message}</p>
        <div className="flex justify-end gap-2">
          <IconButton onClick={onCancel} title={cancelText}>
            <span className="px-2">{cancelText}</span>
          </IconButton>
          <IconButton variant="danger" onClick={onConfirm} title={confirmText}>
            <span className="px-2">{confirmText}</span>
          </IconButton>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  title = "Nada por aqui",
  description = "Tente ajustar a busca ou incluir um novo registro.",
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-neutral-600 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/20 dark:text-neutral-300">
      <p className="mb-1 text-lg font-semibold text-neutral-800 dark:text-neutral-100">{title}</p>
      <p className="mb-4 text-sm">{description}</p>
      {action}
    </div>
  );
}
