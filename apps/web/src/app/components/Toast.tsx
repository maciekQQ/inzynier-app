"use client";

import { useEffect, useState } from "react";

type ToastProps = {
  message: string;
  onClose?: () => void;
  durationMs?: number;
  type?: "info" | "success" | "error";
};

export function Toast({ message, onClose, durationMs = 3200, type = "info" }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 transform">
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="rounded-lg border border-indigo-200 bg-white px-4 py-3 text-sm font-semibold text-indigo-900 shadow-lg shadow-indigo-100"
      >
        <span className="sr-only">
          {type === "error" ? "Błąd: " : type === "success" ? "Sukces: " : "Informacja: "}
        </span>
        {message}
      </div>
    </div>
  );
}

