import { useState, useCallback, createContext, useContext } from "react";
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";

type Tone = "success" | "error" | "info" | "warn";

interface Toast { id: number; tone: Tone; message: string; }

interface ToastCtx {
  push: (tone: Tone, message: string) => void;
}

const Ctx = createContext<ToastCtx>({ push: () => {} });
export const useToast = () => useContext(Ctx);

let _id = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((tone: Tone, message: string) => {
    const id = ++_id;
    setToasts((prev) => [...prev, { id, tone, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </Ctx.Provider>
  );
}

const ICONS: Record<Tone, React.ElementType> = {
  success: CheckCircle,
  error:   XCircle,
  info:    Info,
  warn:    AlertTriangle,
};
const TONES: Record<Tone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error:   "border-red-200    bg-red-50    text-red-800",
  info:    "border-brand-200  bg-brand-50  text-brand-800",
  warn:    "border-amber-200  bg-amber-50  text-amber-800",
};
const ICON_CLS: Record<Tone, string> = {
  success: "text-emerald-500",
  error:   "text-red-500",
  info:    "text-brand-500",
  warn:    "text-amber-500",
};

function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((t) => {
        const Icon = ICONS[t.tone];
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-lg border px-3.5 py-3 shadow-card w-72 fade-in ${TONES[t.tone]}`}
          >
            <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${ICON_CLS[t.tone]}`} />
            <span className="text-xs flex-1 leading-snug">{t.message}</span>
            <button onClick={() => onDismiss(t.id)} className="shrink-0 opacity-60 hover:opacity-100">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* Standalone container used in App (no context needed if you don't need push) */
export function ToastContainer() {
  return null; // ToastProvider wraps App in index.tsx; this is a placeholder
}
