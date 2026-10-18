import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

const ICONS = {
  success: { cls: 'text-green-400', path: 'm5 12.5 4.5 4.5L19 7.5' },
  error: { cls: 'text-red-400', path: 'M12 7v6M12 17h.01' },
  info: { cls: 'text-brass-300', path: 'M12 11v6M12 7h.01' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4 sm:w-full sm:max-w-sm"
      >
        {toasts.map((t) => {
          const icon = ICONS[t.type] ?? ICONS.info;
          return (
            // The drop-shadow lives on the wrapper: the ticket's mask would clip a shadow on itself.
            <div
              key={t.id}
              className="pointer-events-auto w-full animate-pop drop-shadow-[0_12px_18px_rgba(8,1,4,0.65)]"
            >
              <div
                role="status"
                className="ticket flex min-h-12 items-stretch bg-gray-800 text-sm font-medium text-white"
              >
                <span className="grid w-12 shrink-0 place-items-center">
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className={`size-5 ${icon.cls}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={icon.path} />
                  </svg>
                </span>
                <span className="perforation-l my-2" aria-hidden="true" />
                <p className="flex-1 self-center px-4 py-3">{t.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
