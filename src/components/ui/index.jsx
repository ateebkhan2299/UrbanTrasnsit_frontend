import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

// ---------------------------------------------------------------------------
// Toast system
// ---------------------------------------------------------------------------
// The application originally exposed only { addToast, removeToast } while ~28
// call sites used the `toast.success()` / `toast.error()` / `toast.info()` shape.
// Both APIs are supported here so either style works.

const ToastContext = createContext(null);

const TOAST_STYLES = {
  success: 'border-emerald-500/40 bg-emerald-950/90 text-emerald-100',
  error: 'border-red-500/40 bg-red-950/90 text-red-100',
  warning: 'border-amber-500/40 bg-amber-950/90 text-amber-100',
  info: 'border-sky-500/40 bg-sky-950/90 text-sky-100',
};

const TOAST_ICONS = { success: '✓', error: '✕', warning: '!', info: 'i' };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message, type = 'info', duration = 4500) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev, { id, message: String(message ?? ''), type }]);
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
      return id;
    },
    [removeToast],
  );

  const value = useMemo(() => {
    const emit = (type) => (message, opts) =>
      addToast(message, type, typeof opts === 'number' ? opts : opts?.duration);

    return {
      addToast,
      removeToast,
      success: emit('success'),
      error: emit('error'),
      warning: emit('warning'),
      warn: emit('warning'),
      info: emit('info'),
    };
  }, [addToast, removeToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        data-testid="toast-container"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            onClick={() => removeToast(toast.id)}
            className={`pointer-events-auto flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm shadow-lg backdrop-blur transition ${TOAST_STYLES[toast.type] || TOAST_STYLES.info}`}
          >
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-current text-[10px] font-bold">
              {TOAST_ICONS[toast.type] || TOAST_ICONS.info}
            </span>
            <span className="flex-1">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      addToast: () => {},
      removeToast: () => {},
      success: () => {},
      error: () => {},
      warning: () => {},
      warn: () => {},
      info: () => {},
    };
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Surface / theme helpers
// ---------------------------------------------------------------------------
// Pages pass a `dark` flag on some primitives and omit it on others, so every
// component resolves its palette through these helpers instead of hard-coding
// one theme.

const TONES = {
  slate: 'text-slate-400',
  blue: 'text-sky-400',
  emerald: 'text-emerald-400',
  violet: 'text-violet-400',
  rose: 'text-rose-400',
  amber: 'text-amber-400',
  red: 'text-red-400',
};

const surface = () =>
  'bg-[#1F1F1F] border-[#2A2A2A] text-slate-200';
const muted = () => 'text-slate-400';
const hairline = () => 'border-[#2A2A2A]';

function renderIcon(icon, size = 16) {
  if (!icon) return null;
  if (React.isValidElement(icon)) return icon;
  const Ctor = icon;
  return <Ctor size={size} />;
}

// ---------------------------------------------------------------------------
// PageHeader
// ---------------------------------------------------------------------------
// `actions` (ReactNode rendered on the right) and `icon` are the props the
// management pages rely on for their Add / Export / Refresh buttons.

export function PageHeader({ title, subtitle, icon, actions, children, dark }) {
  return (
    <div
      data-testid="page-header"
      className={`mb-5 flex flex-wrap items-start justify-between gap-3 border-b pb-4 ${hairline(dark)}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className={`mt-1 shrink-0 ${dark ? 'text-sky-400' : 'text-sky-600'}`}>
            {renderIcon(icon, 22)}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-white">
            {title || 'Page Header'}
          </h1>
          {subtitle && <p className={`mt-1 text-sm ${muted(dark)}`}>{subtitle}</p>}
        </div>
      </div>
      {(actions || children) && (
        <div data-testid="page-header-actions" className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
          {children}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

export function StatCard({
  title,
  label,
  value,
  icon,
  trend,
  trendValue,
  color,
  description,
  sub,
  tone,
  valueClass,
  dark,
}) {
  const heading = title || label || 'Stat';
  const accent = color || TONES[tone] || TONES.blue;
  return (
    <div
      data-testid="stat-card"
      className={`rounded-xl border p-4 shadow-sm transition ${surface(dark)}`}
    >
      <div className={`flex items-center gap-2 text-xs font-medium uppercase tracking-wide ${muted(dark)}`}>
        {renderIcon(icon, 16)}
        <span className="truncate">{heading}</span>
      </div>
      <div className={`mt-2 text-2xl font-bold tabular-nums ${valueClass || accent}`}>
        {value === 0 || value === '0' ? '0' : (value ?? '0')}
      </div>
      {(trend || trendValue) && (
        <div
          className={`mt-1 text-xs font-semibold ${
            String(trendValue).startsWith('-') ? 'text-red-400' : 'text-emerald-400'
          }`}
        >
          {trendValue} {trend}
        </div>
      )}
      {(description || sub) && <div className={`mt-1 text-xs ${muted(dark)}`}>{description || sub}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading / ErrorState / EmptyState
// ---------------------------------------------------------------------------

export function Loading({ message, label, dark, minHeight = '8rem' }) {
  return (
    <div
      data-testid="loading"
      role="status"
      style={{ minHeight }}
      className={`flex flex-col items-center justify-center gap-3 p-8 text-center ${muted(dark)}`}
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
      <span className="text-sm">{message || label || 'Loading...'}</span>
    </div>
  );
}

export function ErrorState({ title, message, onRetry, dark }) {
  return (
    <div
      data-testid="error-state"
      role="alert"
      className={`rounded-lg border border-red-500/30 bg-red-950/30 p-6 text-center text-red-300`}
    >
      <h3 className="mb-2 font-bold">{title || 'Error'}</h3>
      <p className="text-sm">{message || 'Something went wrong.'}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, message, icon, action, children, dark }) {
  return (
    <div
      data-testid="empty-state"
      className={`flex flex-col items-center justify-center gap-2 rounded-lg border p-8 text-center ${surface(dark)}`}
    >
      {icon && <div className={muted(dark)}>{renderIcon(icon, 32)}</div>}
      <h3 className="font-bold text-slate-200">{title || 'No Data'}</h3>
      <p className={`max-w-md text-sm ${muted(dark)}`}>{message || 'There is no data to display right now.'}</p>
      {action &&
        (typeof action === 'function' ? (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-3 rounded border border-sky-500 px-4 py-2 text-sm font-medium text-sky-400 hover:bg-sky-500/10"
          >
            {action.label}
          </button>
        ) : (
          action
        ))}
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal / ConfirmDialog
// ---------------------------------------------------------------------------
// Pages pass `open`, the original primitive read `isOpen`. Both are honoured so
// every existing call site starts working without touching 21 page files.
// `footer`, `maxWidth` and `closeOnBackdrop` are also honoured.

const WIDTHS = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({
  open,
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'max-w-2xl',
  closeOnBackdrop = true,
  dark,
}) {
  const visible = open ?? isOpen ?? false;

  useEffect(() => {
    if (!visible) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      data-testid="modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Dialog'}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${WIDTHS[maxWidth] || maxWidth || 'max-w-2xl'} rounded-xl border shadow-2xl ${surface(dark)}`}
      >
        <div className={`flex items-center justify-between border-b px-5 py-4 ${hairline(dark)}`}>
          <h2 className="text-lg font-bold text-slate-100">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className={`text-xl leading-none ${muted(dark)} hover:text-slate-200`}
          >
            &times;
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 text-sm">{children}</div>
        {footer && (
          <div className={`flex justify-end gap-2 border-t px-5 py-3 ${hairline(dark)}`}>{footer}</div>
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busy,
  dark,
}) {
  const visible = open ?? isOpen ?? false;
  if (!visible) return null;
  return (
    <Modal
      open
      onClose={onClose}
      title={title || 'Confirm'}
      maxWidth="sm"
      closeOnBackdrop={!busy}
      dark={dark}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={`rounded border px-4 py-2 text-sm disabled:opacity-50 ${hairline(dark)} ${muted(dark)}`}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            data-testid="confirm-accept"
            onClick={onConfirm}
            disabled={busy}
            className="rounded bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p>{message || 'Are you sure?'}</p>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// SearchInput
// ---------------------------------------------------------------------------

export function SearchInput({ value, onChange, placeholder, dark, className = '', ...rest }) {
  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || 'Search...'}
      className={`rounded-lg border px-3 py-2 text-sm outline-none focus:border-sky-500 border-[#2A2A2A] bg-[#141414] text-slate-200 placeholder-slate-500 ${className}`}
      {...rest}
    />
  );
}

// ---------------------------------------------------------------------------
// Small form / layout primitives used across the admin CRUD pages
// ---------------------------------------------------------------------------

export const INPUT_CLASS =
  'w-full rounded-lg border border-[#2A2A2A] bg-[#141414] px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500';

export function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...rest
}) {
  const variants = {
    primary: 'bg-sky-600 text-white hover:bg-sky-700 border-sky-600',
    secondary: 'bg-slate-700 text-slate-100 hover:bg-slate-600 border-slate-600',
    danger: 'bg-red-600 text-white hover:bg-red-700 border-red-600',
    ghost: 'bg-transparent text-slate-300 hover:bg-slate-800 border-transparent',
  };
  const sizes = { sm: 'px-2.5 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-base' };
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
        variants[variant] || variants.primary
      } ${sizes[size] || sizes.md} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Card({ title, children, className = '', actions, dark }) {
  return (
    <div data-testid="card" className={`rounded-xl border p-4 shadow-sm ${surface(dark)} ${className}`}>
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between">
          {title && <h3 className="font-semibold">{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

export function Select({ value, onChange, children, className = '', ...rest }) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className={`${INPUT_CLASS} ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Input(props) {
  return <input {...props} className={INPUT_CLASS} />;
}

export function Table({ children, className = '' }) {
  return (
    <div className={`overflow-x-auto rounded-lg border ${className}`}>
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  );
}

export function Badge({ children, tone = 'slate' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
        {
          slate: 'border-slate-500/40 text-slate-300',
          blue: 'border-sky-500/40 text-sky-300',
          emerald: 'border-emerald-500/40 text-emerald-300',
          amber: 'border-amber-500/40 text-amber-300',
          red: 'border-red-500/40 text-red-300',
          violet: 'border-violet-500/40 text-violet-300',
        }[tone] || TONES.slate
      }`}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export function friendlyError(err) {
  if (!err) return 'An unexpected error occurred';
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length) {
    const first = detail[0];
    if (first?.msg) return `${(first.loc || []).slice(1).join('.')}: ${first.msg}`;
  }
  if (detail) return JSON.stringify(detail);
  return err?.message || 'An unexpected error occurred';
}
