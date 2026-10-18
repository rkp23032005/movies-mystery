import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * A bottom sheet for the filters on small screens, built as a real modal dialog:
 *  - role="dialog" aria-modal, labelled by its title
 *  - Escape and the backdrop close it; page scroll is locked while open
 *  - focus moves in on open, is trapped (Tab / Shift+Tab loop), and returns to the opener on close
 * `footer` renders pinned at the bottom of the sheet (the primary "show results" button).
 */
export default function FilterDrawer({ open, onClose, title = 'Filters', footer, children }) {
  const panelRef = useRef(null);
  const openerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    openerRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector('button')?.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      openerRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:hidden">
      <div aria-hidden="true" className="absolute inset-0 bg-gray-950/80" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-drawer-title"
        className="relative flex max-h-[90dvh] w-full max-w-xl animate-sheet-in flex-col rounded-t-2xl bg-gray-900 shadow-panel ring-1 ring-white/10"
      >
        <div className="flex items-center justify-between px-5 pb-3 pt-5">
          <h2 id="filter-drawer-title" className="text-2xl font-black text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="grid size-10 place-items-center rounded-full text-gray-300 transition-colors hover:bg-white/10 hover:text-white focus-ring"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
        {footer && <div className="border-t border-white/[0.07] bg-gray-900 p-4">{footer}</div>}
      </div>
    </div>
  );
}
