"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type ToastMessage = { type: "success" | "error"; message: string };
type ToastNotification = ToastMessage & { id: number };

const ToastContext = createContext<((feedback: ToastMessage | null) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [feedback, setFeedback] = useState<ToastNotification | null>(null);
  const sequence = useRef(0);
  const notify = useCallback((message: ToastMessage | null) => {
    setFeedback(message ? { ...message, id: ++sequence.current } : null);
  }, []);
  const dismiss = useCallback(() => setFeedback(null), []);

  // Layout state survives navigation from a saved form back to the task list.
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <Toast feedback={feedback} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const notify = useContext(ToastContext);
  if (!notify) throw new Error("useToast must be used inside ToastProvider.");
  return notify;
}

export function Toast({ feedback, onDismiss }: {
  feedback: ToastNotification | null;
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

  function renderNotice(notice: ToastNotification) {
    const success = notice.type === "success";
    return (
      <div
        className={`pointer-events-auto relative flex items-start gap-3 rounded-xl border bg-surface p-4 shadow-lg ${success ? "border-success/30" : "border-danger/30"}`}
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
        {success && (
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 overflow-hidden rounded-b-xl bg-success-soft">
            <div
              key={notice.id}
              className="toast-progress h-full w-full origin-left bg-success"
              style={{ animationPlayState: hovered || focused ? "paused" : "running" }}
              // One animation controls both the visual timer and dismissal.
              onAnimationEnd={onDismiss}
            />
          </div>
        )}
      </div>
    );
  }
}
