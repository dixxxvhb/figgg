import React, { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Keyboard support: Escape to cancel, Enter to confirm
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter' && !danger) {
        e.preventDefault();
        onConfirm();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    // Auto-focus confirm button
    confirmRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-blush-800 rounded-2xl shadow-xl w-full max-w-xs overflow-hidden">
        <div className="p-5 text-center">
          {danger && (
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={24} className="text-red-500" />
            </div>
          )}
          {title && (
            <h3 className="text-lg font-semibold text-forest-700 dark:text-white mb-1">
              {title}
            </h3>
          )}
          <p className="text-sm text-forest-500 dark:text-blush-300">{message}</p>
        </div>

        <div className="flex border-t border-blush-200 dark:border-blush-700">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 text-sm font-medium text-forest-600 dark:text-blush-300 hover:bg-blush-50 dark:hover:bg-blush-700 transition-colors"
          >
            {cancelLabel}
          </button>
          <div className="w-px bg-blush-200 dark:bg-blush-700" />
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
              danger
                ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                : 'text-forest-600 hover:bg-forest-50 dark:hover:bg-forest-900/20'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook for easy usage
export function useConfirmDialog() {
  const [state, setState] = React.useState<{
    open: boolean;
    message: string;
    title?: string;
    confirmLabel?: string;
    danger?: boolean;
    resolve: ((value: boolean) => void) | null;
  }>({
    open: false,
    message: '',
    resolve: null,
  });

  const confirm = React.useCallback(
    (message: string, options?: { title?: string; confirmLabel?: string; danger?: boolean }) => {
      return new Promise<boolean>((resolve) => {
        setState({
          open: true,
          message,
          title: options?.title,
          confirmLabel: options?.confirmLabel,
          danger: options?.danger ?? true,
          resolve,
        });
      });
    },
    []
  );

  const handleConfirm = React.useCallback(() => {
    state.resolve?.(true);
    setState((s) => ({ ...s, open: false, resolve: null }));
  }, [state.resolve]);

  const handleCancel = React.useCallback(() => {
    state.resolve?.(false);
    setState((s) => ({ ...s, open: false, resolve: null }));
  }, [state.resolve]);

  const dialog = (
    <ConfirmDialog
      open={state.open}
      message={state.message}
      title={state.title}
      confirmLabel={state.confirmLabel}
      danger={state.danger}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { confirm, dialog };
}
