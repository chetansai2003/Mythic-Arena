import { useEffect, useRef, useId } from 'react';
import { AlertCircle, Check, LoaderCircle, X } from 'lucide-react';

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}) {
  return (
    <button className={`button button-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function Dialog({ open, onClose, title, action, children }) {
  const titleId = useId();
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const dialog = ref.current;
    if (!open) return;
    const previous = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus();
    };
  }, [open]);
  function containFocus(event) {
    if (event.key !== 'Tab') return;
    const items = [
      ...ref.current.querySelectorAll(
        'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
      ),
    ];
    const first = items[0];
    const last = items.at(-1);
    if (!first) {
      event.preventDefault();
      ref.current.focus();
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onKeyDown={containFocus}
      onCancel={(event) => {
        event.preventDefault();
        closeRef.current();
      }}
    >
      <div className="dialog-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <div className="dialog-body">{children}</div>
      {action !== undefined ? (
        action && <div className="dialog-actions">{action}</div>
      ) : (
        <div className="dialog-actions">
          <Button variant="secondary" onClick={onClose}>
            Got it
          </Button>
        </div>
      )}
    </dialog>
  );
}
export function Toast({ message, onDismiss }) {
  return (
    <div className="toast" role="status">
      <Check size={18} />
      <span>{message}</span>
      <button
        className="icon-button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  );
}
export function StatusBanner({ children, kind = 'info', action }) {
  return (
    <div
      className={`status-banner ${kind}`}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      <AlertCircle size={18} />
      <span>{children}</span>
      {action}
    </div>
  );
}
export function Skeleton({ label = 'Loading' }) {
  return (
    <div className="skeleton" role="status">
      <LoaderCircle size={16} className="spin" />
      <span>{label}</span>
    </div>
  );
}
export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon size={28} />
      </div>
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Field({ label, id, children, ...props }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children || <input id={id} {...props} />}
    </div>
  );
}
