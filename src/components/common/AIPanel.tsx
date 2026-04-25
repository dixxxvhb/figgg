import { lazy, Suspense, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { useAIPanel } from '../../contexts/AIPanelContext';
import { useAppData } from '../../contexts/AppDataContext';
import { PageSkeleton } from './PageSkeleton';
import { AccentDot } from '../dx/AccentDot';

const AIChat = lazy(() => import('../../pages/AIChat').then(m => ({ default: m.AIChat })));

type CaptureMode = 'mood' | 'thought' | 'task' | 'med' | 'blocker' | 'ai';

const MODES: { id: CaptureMode; label: string; hint: string }[] = [
  { id: 'mood',    label: 'mood',    hint: 'how is it' },
  { id: 'thought', label: 'thought', hint: 'dump it' },
  { id: 'task',    label: 'task',    hint: 'something to do' },
  { id: 'med',     label: 'med',     hint: 'took it' },
  { id: 'blocker', label: 'blocker', hint: 'what stopped you' },
  { id: 'ai',      label: 'ai',      hint: 'ask the robot' },
];

export function AIPanel() {
  const { isOpen, open, close } = useAIPanel();
  const { data, updateSettings, updateSelfCare, saveAICheckIn } = useAppData();
  const [isExpanded, setIsExpanded] = useState(false);
  const [mode, setMode] = useState<CaptureMode>(() => (data.settings?.quickcaptureDefaultMode as CaptureMode) || 'ai');
  const [input, setInput] = useState('');
  const [flash, setFlash] = useState<{ msg: string; kind: 'success' | 'error' } | null>(null);
  const location = useLocation();

  const hideOnAIPage = location.pathname === '/ai';

  useEffect(() => {
    queueMicrotask(() => {
      close();
      setIsExpanded(false);
      setInput('');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close is intentionally excluded to avoid re-firing on every render
  }, [location.pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); setIsExpanded(false); }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, close]);

  const pickMode = (next: CaptureMode) => {
    setMode(next);
    updateSettings({ quickcaptureDefaultMode: next });
    setInput('');
    setFlash(null);
  };

  const showFlash = (msg: string, kind: 'success' | 'error' = 'success') => {
    setFlash({ msg, kind });
    const timeoutMs = kind === 'error' ? 4000 : 1400;
    setTimeout(() => setFlash(null), timeoutMs);
  };

  const submit = async () => {
    const value = input.trim();
    if (mode === 'mood' && value) {
      try {
        await saveAICheckIn({
          id: `qc-${Date.now()}`,
          date: new Date().toISOString().slice(0, 10),
          type: new Date().getHours() < 14 ? 'morning' : 'afternoon',
          userMessage: value,
          aiResponse: '',
          mood: value.toLowerCase().slice(0, 40),
          timestamp: new Date().toISOString(),
        });
        showFlash('logged');
        setInput('');
      } catch (e) {
        console.error('mood log failed', e);
        showFlash("didn't save", 'error');
        // Preserve input so Dixon can retry without retyping.
      }
    } else if (mode === 'thought' && value) {
      updateSelfCare({ scratchpad: `${value}\n\n${data.selfCare?.scratchpad || ''}`.slice(0, 4000) });
      showFlash('saved');
      setInput('');
    } else if ((mode === 'task' || mode === 'blocker') && value) {
      const reminders = data.selfCare?.reminders || [];
      const lists = data.selfCare?.reminderLists || [];
      const defaultListId = lists[0]?.id || 'inbox';
      const now = new Date().toISOString();
      updateSelfCare({
        reminders: [
          ...reminders,
          {
            id: `rem-${Date.now()}`,
            title: mode === 'blocker' ? `blocker: ${value}` : value,
            listId: defaultListId,
            completed: false,
            priority: mode === 'blocker' ? 'high' : 'medium',
            flagged: mode === 'blocker',
            createdAt: now,
            updatedAt: now,
          },
        ],
      });
      showFlash(mode === 'blocker' ? 'flagged' : 'saved');
      setInput('');
    } else if (mode === 'med') {
      const now = Date.now();
      const sc = data.selfCare || {};
      if (!sc.dose1Time) {
        updateSelfCare({ dose1Time: now, dose1Date: new Date().toISOString().slice(0, 10) });
        showFlash('dose 1 logged');
      } else if (!sc.dose2Time) {
        updateSelfCare({ dose2Time: now, dose2Date: new Date().toISOString().slice(0, 10) });
        showFlash('dose 2 logged');
      } else if (!sc.dose3Time) {
        updateSelfCare({ dose3Time: now, dose3Date: new Date().toISOString().slice(0, 10) });
        showFlash('dose 3 logged');
      } else {
        showFlash('all doses today');
      }
    }
  };

  return (
    <>
      {!isOpen && !hideOnAIPage && (
        <button
          onClick={open}
          className="fixed z-40 flex items-center justify-center active:scale-90 transition-transform"
          style={{
            bottom: 'calc(56px + 16px + env(safe-area-inset-bottom, 0px))',
            right: '16px',
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: 'var(--dx-elevated)',
            border: '1px solid var(--dx-accent)',
            color: 'var(--dx-accent)',
            fontFamily: 'var(--font-mono)',
            fontSize: '1.25rem',
            fontWeight: 600,
            letterSpacing: '-0.02em',
          }}
          aria-label="open quickcapture"
        >
          <AccentDot size={8} />
        </button>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-50 transition-opacity"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => { close(); setIsExpanded(false); }}
        />
      )}

      {isOpen && (
        <div
          className="fixed left-0 right-0 z-50 flex flex-col transition-all duration-300"
          style={{
            backgroundColor: 'var(--dx-bg)',
            borderTop: '1px solid var(--dx-border-active)',
            borderRadius: isExpanded ? 0 : '12px 12px 0 0',
            ...(isExpanded
              ? { top: 0, bottom: 0 }
              : { bottom: 0, height: mode === 'ai' ? '70vh' : 'auto', maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px))' }),
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderBottom: '1px solid var(--dx-border-dim)',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.625rem',
                color: 'var(--dx-text-3)',
                letterSpacing: '0.18em',
              }}
            >
              // capture
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                aria-label={isExpanded ? 'collapse' : 'expand'}
                style={{ background: 'transparent', border: 'none', color: 'var(--dx-text-3)', padding: 4, cursor: 'pointer' }}
              >
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button
                onClick={() => { close(); setIsExpanded(false); }}
                aria-label="close"
                style={{ background: 'transparent', border: 'none', color: 'var(--dx-text-3)', padding: 4, cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', padding: '10px 14px', overflowX: 'auto' }}>
            {MODES.map((m) => {
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => pickMode(m.id)}
                  style={{
                    flexShrink: 0,
                    padding: '6px 10px',
                    borderRadius: '2px',
                    border: `1px solid ${active ? 'var(--dx-accent)' : 'var(--dx-border-dim)'}`,
                    backgroundColor: active ? 'var(--dx-elevated)' : 'transparent',
                    color: active ? 'var(--dx-accent)' : 'var(--dx-text-2)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.6875rem',
                    letterSpacing: '0.12em',
                    cursor: 'pointer',
                  }}
                >
                  // {m.label}
                </button>
              );
            })}
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: mode === 'ai' ? 0 : '6px 14px 14px' }}>
            {mode === 'ai' ? (
              <Suspense fallback={<PageSkeleton />}>
                <AIChat />
              </Suspense>
            ) : (
              <CaptureBody
                mode={mode}
                input={input}
                setInput={setInput}
                submit={submit}
                hint={MODES.find((m) => m.id === mode)?.hint || ''}
              />
            )}
          </div>

          {flash && (() => {
            const isError = flash.kind === 'error';
            return (
              <div
                role={isError ? 'alert' : 'status'}
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  padding: '6px 10px',
                  backgroundColor: 'var(--dx-elevated)',
                  border: `1px solid ${isError ? 'var(--dx-error)' : 'var(--dx-accent)'}`,
                  borderRadius: '2px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.625rem',
                  color: isError ? 'var(--dx-error)' : 'var(--dx-accent)',
                  letterSpacing: '0.18em',
                }}
              >
                {flash.msg}
              </div>
            );
          })()}
        </div>
      )}
    </>
  );
}

function CaptureBody({
  mode,
  input,
  setInput,
  submit,
  hint,
}: {
  mode: CaptureMode;
  input: string;
  setInput: (s: string) => void;
  submit: () => void;
  hint: string;
}) {
  if (mode === 'med') {
    return (
      <div style={{ padding: '16px 0' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--dx-text-2)', marginBottom: '16px' }}>
          tap to log next dose. auto-fills from schedule.
        </p>
        <button
          onClick={submit}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: 'transparent',
            border: '1px solid var(--dx-accent)',
            borderRadius: '2px',
            color: 'var(--dx-accent)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            fontWeight: 500,
            letterSpacing: '0.12em',
            cursor: 'pointer',
            textTransform: 'lowercase',
          }}
        >
          // took it
        </button>
      </div>
    );
  }
  const isTextarea = mode === 'thought' || mode === 'blocker';
  const Component = isTextarea ? 'textarea' : 'input';
  return (
    <div style={{ padding: '10px 0' }}>
      <Component
        autoFocus
        value={input}
        onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (!isTextarea && e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
          if (isTextarea && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={hint}
        rows={isTextarea ? 6 : undefined}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: 'var(--dx-elevated)',
          border: '1px solid var(--dx-border-dim)',
          borderRadius: '2px',
          color: 'var(--dx-text-1)',
          fontFamily: 'var(--font-body)',
          fontSize: '0.9375rem',
          lineHeight: 1.5,
          resize: isTextarea ? 'vertical' : undefined,
        }}
      />
      <button
        onClick={submit}
        disabled={!input.trim()}
        style={{
          marginTop: '10px',
          padding: '10px 14px',
          backgroundColor: 'transparent',
          border: `1px solid ${input.trim() ? 'var(--dx-accent)' : 'var(--dx-border-dim)'}`,
          borderRadius: '2px',
          color: input.trim() ? 'var(--dx-accent)' : 'var(--dx-text-4)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          fontWeight: 500,
          letterSpacing: '0.12em',
          cursor: input.trim() ? 'pointer' : 'default',
          textTransform: 'lowercase',
        }}
      >
        // save {isTextarea ? '⌘↵' : '↵'}
      </button>
    </div>
  );
}
