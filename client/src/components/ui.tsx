import { useEffect, useId, useMemo, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import type { OrderStatus } from "../lib/api";
import { useI18n } from "../lib/i18n";

export function Logo({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 64 64" className="size-8" aria-hidden>
        <rect width="64" height="64" rx="18" fill="#1f1b17" />
        <path d="M14 40c8-18 14-18 18-6s10 12 18-10" fill="none" stroke="#e8c9a0" strokeWidth="4" strokeLinecap="round" />
        <circle cx="50" cy="24" r="4" fill="#b5573a" />
      </svg>
      <span className="display text-2xl leading-none rtl:text-xl">{t.brand}</span>
    </span>
  );
}

const TONES: Record<OrderStatus, string> = {
  pending: "bg-gold-soft text-gold",
  paid: "bg-nile-soft text-nile",
  shipped: "bg-[#e4e8f3] text-[#3b4f8a]",
  delivered: "bg-nile text-white",
  cancelled: "bg-black/[0.06] text-faint line-through",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useI18n();
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${TONES[status]}`}>{t.status[status]}</span>;
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useI18n();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} onClick={(event) => event.target === ref.current && onClose()} className={`m-auto w-[calc(100%-2rem)] rounded-3xl border border-line bg-card p-0 text-ink shadow-2xl backdrop:bg-ink/40 backdrop:backdrop-blur-[2px] ${wide ? "max-w-2xl" : "max-w-md"}`}>
      {open && (
        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button type="button" onClick={onClose} className="btn-quiet -me-2 p-2" aria-label={t.common.close}>
              <X className="size-4" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function Field({ label, error, hint, children, id }: { label: string; error?: string; hint?: string; children: ReactNode; id: string }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1.5 text-xs font-medium text-clay">{error}</p> : hint ? <p className="mt-1.5 text-xs text-faint">{hint}</p> : null}
    </div>
  );
}

/** Thread goes through the needle's eye, then the needle sews a row of stitches. Styles live in index.html. */
export function NeedleLoader({ width = 240 }: { width?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  // The drawing lives once in index.html (#kn-tpl) so the splash and this stay identical.
  const html = useMemo(() => document.getElementById("kn-tpl")?.innerHTML.replace(/__ID__/g, id) ?? "", [id]);
  return <span className="block" style={{ width }} aria-hidden dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Spinner({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-sm text-faint" role="status">
      <NeedleLoader width={150} />
      <span className={label ? "" : "sr-only"}>{label ?? t.common.loading}</span>
    </div>
  );
}

export function ErrorBox({ onRetry, text }: { onRetry?: () => void; text?: string }) {
  const { t } = useI18n();
  return (
    <div className="card mx-auto my-10 max-w-md p-8 text-center text-sm text-soft">
      <p>{text ?? t.common.error}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-ghost mt-4">
          {t.common.retry}
        </button>
      )}
    </div>
  );
}
