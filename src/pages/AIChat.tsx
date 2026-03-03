import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Send, Loader2, Plus, Sparkles, Undo2, History, Trash2, ChevronLeft } from 'lucide-react';
import { useAppData } from '../contexts/AppDataContext';
import { callAIChat } from '../services/ai';
import type { AIChatRequest } from '../services/ai';
import type { AIChatMessage, AIChatThread } from '../types';
import { DEFAULT_MED_CONFIG } from '../types';
import { buildFullAIContext } from '../services/aiContext';
import { executeAIActions } from '../services/aiActions';
import type { ActionCallbacks } from '../services/aiActions';
import { haptic } from '../utils/haptics';
import { updateSettings as updateStorageSettings } from '../services/storage';
import { applyTheme } from '../styles/applyTheme';
import { auth } from '../services/firebase';
import { getChatThreads, saveChatThread, deleteChatThread } from '../services/firestore';
import { v4 as uuid } from 'uuid';
import { format, parseISO } from 'date-fns';

type View = 'chat' | 'history';

export function AIChat() {
  const {
    data,
    updateSelfCare,
    saveDayPlan,
    saveWeekNotes,
    getCurrentWeekNotes,
    updateLaunchPlan,
    updateCompetitionDance,
    updateClass,
    updateStudent,
  } = useAppData();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [view, setView] = useState<View>('chat');
  const [threads, setThreads] = useState<AIChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastActionSnapshot, setLastActionSnapshot] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dataRef = useRef(data);
  dataRef.current = data;
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load threads from Firestore on mount
  useEffect(() => {
    const uid = auth?.currentUser?.uid;
    if (!uid) return;
    getChatThreads(uid).then(setThreads).catch(console.warn);
  }, []);

  // Save thread to Firestore (debounced)
  const persistThread = useCallback((threadId: string, msgs: AIChatMessage[]) => {
    const uid = auth?.currentUser?.uid;
    if (!uid || msgs.length === 0) return;
    clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(() => {
      const firstUserMsg = msgs.find(m => m.role === 'user');
      const thread: AIChatThread = {
        id: threadId,
        title: firstUserMsg?.content.slice(0, 60) || 'New chat',
        messages: msgs,
        createdAt: msgs[0].timestamp,
        lastMessageAt: msgs[msgs.length - 1].timestamp,
      };
      saveChatThread(uid, thread).catch(console.warn);
      // Update local threads list
      setThreads(prev => {
        const without = prev.filter(t => t.id !== threadId);
        return [thread, ...without];
      });
    }, 1000);
  }, []);

  // Handle preloaded message from nudge cards
  useEffect(() => {
    const preload = searchParams.get('preload');
    if (preload && messages.length === 0) {
      setInput(preload);
    }
  }, [searchParams, messages.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Build action callbacks
  const medConfig = data.settings?.medConfig || DEFAULT_MED_CONFIG;
  const handleUpdateSettings = useCallback((updates: Partial<import('../types').AppSettings>) => {
    updateStorageSettings(updates);
    if (updates.darkMode !== undefined) {
      if (updates.darkMode) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    }
    if (updates.themeId) {
      applyTheme(updates.themeId, document.documentElement.classList.contains('dark'));
    }
    if (updates.fontSize) {
      const root = document.documentElement;
      switch (updates.fontSize) {
        case 'large': root.style.fontSize = '18px'; break;
        case 'extra-large': root.style.fontSize = '20px'; break;
        default: root.style.fontSize = '16px';
      }
    }
  }, []);

  const actionCallbacks: ActionCallbacks = useMemo(() => ({
    getData: () => dataRef.current,
    updateSelfCare,
    saveDayPlan,
    saveWeekNotes,
    getCurrentWeekNotes,
    updateLaunchPlan,
    updateCompetitionDance,
    getMedConfig: () => medConfig,
    updateClass,
    updateSettings: handleUpdateSettings,
    updateStudent,
  }), [updateSelfCare, saveDayPlan, saveWeekNotes, getCurrentWeekNotes, updateLaunchPlan, updateCompetitionDance, medConfig, updateClass, handleUpdateSettings, updateStudent]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput('');
    haptic('light');

    // Create thread ID if this is a new conversation
    const threadId = activeThreadId || uuid();
    if (!activeThreadId) setActiveThreadId(threadId);

    const userMsg: AIChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const context = buildFullAIContext(dataRef.current, userMessage);
      const request: AIChatRequest = {
        mode: 'chat',
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        userMessage,
        context,
      };
      const result = await callAIChat(request);

      if (result.actions?.length) {
        try {
          setLastActionSnapshot(JSON.stringify({
            selfCare: dataRef.current.selfCare,
            dayPlan: dataRef.current.dayPlan,
            launchPlan: dataRef.current.launchPlan,
          }));
        } catch { /* snapshot too large */ }
        executeAIActions(result.actions, actionCallbacks);
      }

      const aiMsg: AIChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: result.response,
        actions: result.actions,
        adjustments: result.adjustments,
        timestamp: new Date().toISOString(),
      };
      const finalMessages = [...updatedMessages, aiMsg];
      setMessages(finalMessages);
      persistThread(threadId, finalMessages);
    } catch (err) {
      console.error('[AIChat] error:', err);
      // Extract meaningful message from Firebase/Anthropic errors
      let errorText = "Sorry, I couldn't connect. Try again?";
      if (err && typeof err === 'object') {
        const firebaseErr = err as { code?: string; message?: string };
        const msg = firebaseErr.message || '';
        if (msg.includes('API key')) {
          errorText = "The AI API key needs to be updated. Let Dixon know!";
        } else if (msg.includes('rate limit') || firebaseErr.code === 'functions/resource-exhausted') {
          errorText = "I'm getting too many requests right now. Give me a sec and try again.";
        } else if (msg.includes('overloaded') || firebaseErr.code === 'functions/unavailable') {
          errorText = "The AI service is busy right now. Try again in a moment.";
        } else if (msg.includes('unauthenticated') || firebaseErr.code === 'functions/unauthenticated') {
          errorText = "You need to sign in again. Try refreshing the app.";
        } else if (msg.includes('network') || msg.includes('Failed to fetch') || msg.includes('ENOTFOUND')) {
          errorText = "Looks like you're offline. Check your connection and try again.";
        } else if (firebaseErr.code === 'functions/internal') {
          errorText = "Something went wrong on the AI side. Try again?";
        }
      }
      const errorMsg: AIChatMessage = {
        id: `msg-${Date.now()}-err`,
        role: 'assistant',
        content: errorText,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, actionCallbacks, activeThreadId, persistThread]);

  const handleNewChat = () => {
    setMessages([]);
    setInput('');
    setActiveThreadId(null);
    setLastActionSnapshot(null);
    setView('chat');
    haptic('light');
  };

  const handleLoadThread = (thread: AIChatThread) => {
    setMessages(thread.messages);
    setActiveThreadId(thread.id);
    setLastActionSnapshot(null);
    setView('chat');
    haptic('light');
  };

  const handleDeleteThread = async (threadId: string) => {
    const uid = auth?.currentUser?.uid;
    if (!uid) return;
    haptic('light');
    setThreads(prev => prev.filter(t => t.id !== threadId));
    if (activeThreadId === threadId) {
      setMessages([]);
      setActiveThreadId(null);
    }
    deleteChatThread(uid, threadId).catch(console.warn);
  };

  const handleUndo = useCallback(() => {
    if (!lastActionSnapshot) return;
    try {
      const snapshot = JSON.parse(lastActionSnapshot);
      if (snapshot.selfCare) updateSelfCare(snapshot.selfCare);
      if (snapshot.dayPlan) saveDayPlan(snapshot.dayPlan);
      if (snapshot.launchPlan) updateLaunchPlan(snapshot.launchPlan);
      setLastActionSnapshot(null);
      haptic('medium');
      const undoMsg: AIChatMessage = {
        id: `msg-${Date.now()}-undo`,
        role: 'assistant',
        content: 'Changes undone.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, undoMsg]);
    } catch {
      console.warn('Failed to undo actions');
    }
  }, [lastActionSnapshot, updateSelfCare, saveDayPlan, updateLaunchPlan]);

  // ── History View ──
  if (view === 'history') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-card)]">
          <button onClick={() => setView('chat')} className="flex items-center gap-1 text-[var(--accent-primary)]">
            <ChevronLeft size={18} />
            <span className="text-sm font-medium">Back</span>
          </button>
          <span className="text-sm font-semibold text-[var(--text-primary)]">Chat History</span>
          <div className="w-16" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 && (
            <div className="text-center py-12">
              <History size={32} className="mx-auto mb-3 text-[var(--text-tertiary)]" />
              <p className="text-sm text-[var(--text-tertiary)]">No previous chats</p>
            </div>
          )}
          {threads.map(thread => (
            <div key={thread.id} className="flex items-center border-b border-[var(--border-subtle)]">
              <button
                onClick={() => handleLoadThread(thread)}
                className="flex-1 px-4 py-3.5 text-left hover:bg-[var(--surface-card-hover)] transition-colors"
              >
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{thread.title}</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                  {format(parseISO(thread.lastMessageAt), 'MMM d, h:mm a')} · {thread.messages.length} messages
                </p>
              </button>
              <button
                onClick={() => handleDeleteThread(thread.id)}
                className="px-3 py-3.5 text-[var(--text-tertiary)] hover:text-[var(--status-danger)]"
                aria-label="Delete thread"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Chat View ──
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-card)]">
        <div className="w-[50px]" />
        <div className="flex items-center gap-1.5 text-[var(--text-primary)]">
          <Sparkles size={16} className="text-[var(--accent-primary)]" />
          <span className="text-sm font-semibold">AI Chat</span>
        </div>
        <div className="flex items-center gap-1">
          {lastActionSnapshot && (
            <button
              onClick={handleUndo}
              className="text-[var(--status-warning)] min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Undo last AI action"
            >
              <Undo2 size={18} />
            </button>
          )}
          <button
            onClick={() => setView('history')}
            className="text-[var(--text-tertiary)] min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Chat history"
          >
            <History size={18} />
          </button>
          <button
            onClick={handleNewChat}
            className="text-[var(--accent-primary)] min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="New chat"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Sparkles size={32} className="mx-auto mb-3 text-[var(--text-tertiary)]" />
            <p className="text-sm text-[var(--text-tertiary)]">
              Ask me anything about your day, classes, or tasks.
            </p>
            {threads.length > 0 && (
              <button
                onClick={() => setView('history')}
                className="mt-3 text-xs text-[var(--accent-primary)] flex items-center gap-1 mx-auto"
              >
                <History size={12} />
                {threads.length} previous chat{threads.length > 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
                  : 'bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--text-primary)]'
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </p>
              {msg.adjustments && msg.adjustments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {msg.adjustments.map((adj, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                    >
                      {adj}
                    </span>
                  ))}
                </div>
              )}
              {msg.actions && msg.actions.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
                  <p className="text-[10px] text-[var(--text-tertiary)] mb-1">Actions applied:</p>
                  <div className="flex flex-wrap gap-1">
                    {msg.actions.map((action, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-inset)] text-[var(--text-secondary)]">
                        {action.type || 'action'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-2xl px-4 py-2.5">
              <Loader2 size={16} className="animate-spin text-[var(--accent-primary)]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3 pb-safe">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask anything..."
            className="flex-1 px-4 py-2.5 text-sm bg-[var(--surface-inset)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] disabled:opacity-30 active:scale-95 transition-transform"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
