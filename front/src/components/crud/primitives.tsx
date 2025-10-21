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
    "p-2 rounded-xl text-sm transition shadow hover:shadow-md disabled:opacity-50 inline-flex items-center justify-center";
  const styles = {
    default: "bg-neutral-800 text-white hover:bg-neutral-700",
    primary: "bg-blue-600 text-white hover:bg-blue-500",
    danger: "bg-red-600 text-white hover:bg-red-500",
    green: "bg-green-600 text-white hover:bg-green-500"
  } as const;
  return (
    <button
      className={`${base} ${styles[variant]} cursor-pointer ${className}`}
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
      <div className="relative z-[101] w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-neutral-300 mb-5">{message}</p>
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
    <div className="border border-neutral-800 rounded-2xl p-8 text-center text-neutral-300">
      <p className="text-lg font-semibold mb-1">{title}</p>
      <p className="text-sm mb-4">{description}</p>
      {action}
    </div>
  );
}
