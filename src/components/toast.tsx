"use client";

import { useEffect, useState } from "react";

export type ToastMessage = { type: "success" | "error"; message: string };

export function Toast({ feedback, onDismiss }: {
  feedback: ToastMessage | null;
  onDismiss: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!feedback) {
      setHovered(false);
      setFocused(false);
    }
  }, [feedback]);

  useEffect(() => {
    // Errors stay visible; successful notices pause while being read or focused.
    if (feedback?.type !== "success" || hovered || focused) return;
    const timer = window.setTimeout(onDismiss, 5_000);
    return () => window.clearTimeout(timer);
  }, [feedback, hovered, focused, onDismiss]);

  return (
    <div className="pointer-events-none fixed bottom-6 left-4 right-4 z-50 sm:left-auto sm:right-6 sm:w-96">
      <div role="status" aria-atomic="true">
        {feedback?.type === "success" && renderNotice(feedback)}
      </div>
      <div role="alert" aria-atomic="true">
        {feedback?.type === "error" && renderNotice(feedback)}
      </div>
    </div>
  );

  function renderNotice(notice: ToastMessage) {
    const success = notice.type === "success";
    return (
      <div
        className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-surface p-4 shadow-lg ${success ? "border-success/30" : "border-danger/30"}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
        }}
      >
        <span aria-hidden="true" className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-semibold ${success ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
          {success ? "✓" : "!"}
        </span>
        <p className="min-w-0 flex-1 break-words py-1 text-base leading-6 text-ink">{notice.message}</p>
        <button
          type="button"
          aria-label="Fechar notificação"
          onClick={onDismiss}
          className="-my-1 -mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-canvas hover:text-ink"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    );
  }
}
