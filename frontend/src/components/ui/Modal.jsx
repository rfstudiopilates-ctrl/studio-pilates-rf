import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import NavIcon from './NavIcon';

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer = null,
  size = 'md',
  bodyScroll = true,
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') {
    return null;
  }

  const sizes = {
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-3xl',
    '2xl': 'max-w-5xl',
    '3xl': 'max-w-6xl',
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Cerrar modal"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-[101] flex max-h-[min(90dvh,880px)] w-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-[0_24px_80px_rgba(26,26,26,0.18)] ${sizes[size] || sizes.md}`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-text">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-text-muted">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border p-2 text-text-muted transition hover:bg-surface-muted hover:text-text"
            aria-label="Cerrar"
          >
            <NavIcon name="close" className="h-5 w-5" />
          </button>
        </div>

        <div
          className={`min-h-0 flex-1 px-5 py-4 sm:px-6 sm:py-5 ${
            bodyScroll
              ? 'overflow-y-auto overscroll-contain'
              : 'flex flex-col overflow-hidden'
          }`}
        >
          {children}
        </div>

        {footer ? (
          <div className="shrink-0 border-t border-border bg-white px-5 py-3.5 sm:px-6 sm:py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
