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
  }, [open, onCancel, onConfirm, danger]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'confirm-dialog-title' : undefined}
        aria-describedby="confirm-dialog-message"
        className="relative bg-[var(--surface-card)] rounded-2xl shadow-xl w-full max-w-xs overflow-hidden"
      >
        <div className="p-5 text-center">
          {danger && (
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'color-mix(in srgb, var(--status-danger) 15%, transparent)' }}>
              <AlertTriangle size={24} className="text-[var(--status-danger)]" />
            </div>
          )}
          {title && (
            <h3 id="confirm-dialog-title" className="text-lg font-semibold text-[var(--text-primary)] mb-1">
              {title}
            </h3>
          )}
          <p id="confirm-dialog-message" className="text-sm text-[var(--text-secondary)]">{message}</p>
        </div>

        <div className="flex border-t border-[var(--border-subtle)]">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-inset)] transition-colors"
          >
            {cancelLabel}
          </button>
          <div className="w-px bg-[var(--border-subtle)]" />
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
              danger
                ? 'text-[var(--status-danger)] hover:bg-[var(--surface-inset)]'
                : 'text-[var(--accent-primary)] hover:bg-[var(--surface-inset)]'
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
  }>({
    open: false,
    message: '',
  });

  const resolveRef = React.useRef<((value: boolean) => void) | null>(null);

  const confirm = React.useCallback(
    (message: string, options?: { title?: string; confirmLabel?: string; danger?: boolean }) => {
      return new Promise<boolean>((resolve) => {
        resolveRef.current = resolve;
        setState({
          open: true,
          message,
          title: options?.title,
          confirmLabel: options?.confirmLabel,
          danger: options?.danger ?? true,
        });
      });
    },
    []
  );

  const handleConfirm = React.useCallback(() => {
    resolveRef.current?.(true);
    resolveRef.current = null;
    setState((s) => ({ ...s, open: false }));
  }, []);

  const handleCancel = React.useCallback(() => {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setState((s) => ({ ...s, open: false }));
  }, []);

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
