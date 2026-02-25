import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send, Loader2, Plus, Sparkles } from 'lucide-react';
import { useAppData } from '../contexts/AppDataContext';
import { callAIChat } from '../services/ai';
import type { AIChatRequest } from '../services/ai';
import type { AIChatMessage } from '../types';
import { DEFAULT_MED_CONFIG } from '../types';
import { buildFullAIContext } from '../services/aiContext';
import { executeAIActions } from '../services/aiActions';
import type { ActionCallbacks } from '../services/aiActions';
import { haptic } from '../utils/haptics';

export function AIChat() {
  const {
    data,
    updateSelfCare,
    saveDayPlan,
    saveWeekNotes,
    getCurrentWeekNotes,
    updateLaunchPlan,
    updateCompetitionDance,
    updateDisruption,
    updateClass,
    addClass,
    saveAIModification,
    saveChatHistory,
  } = useAppData();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState<AIChatMessage[]>(() => {
    // Restore chat history from persisted data
    const history = data.chatHistory || [];
    if (history.length > 0) {
      // Only restore if the latest message is from today
      const latest = history[history.length - 1];
      const todayStr = new Date().toISOString().slice(0, 10);
      if (latest.timestamp.slice(0, 10) === todayStr) {
        return history;
      }
    }
    return [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  // Handle preloaded message from nudge cards
  useEffect(() => {
    const preload = searchParams.get('preload');
    if (preload && messages.length === 0) {
      setInput(preload);
    }
  }, [searchParams, messages.length]);

  // Persist chat messages when they change
  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory(messages.slice(-50)); // Keep last 50 messages
    }
  }, [messages, saveChatHistory]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Build action callbacks
  const medConfig = data.settings?.medConfig || DEFAULT_MED_CONFIG;
  const actionCallbacks: ActionCallbacks = useMemo(() => ({
    getData: () => dataRef.current,
    updateSelfCare,
    saveDayPlan,
    saveWeekNotes,
    getCurrentWeekNotes,
    updateLaunchPlan,
    updateCompetitionDance,
    updateDisruption,
    getMedConfig: () => medConfig,
    updateClass,
    addClass,
    logModification: saveAIModification,
  }), [updateSelfCare, saveDayPlan, saveWeekNotes, getCurrentWeekNotes, updateLaunchPlan, updateCompetitionDance, updateDisruption, medConfig, updateClass, addClass, saveAIModification]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput('');
    haptic('light');

    const userMsg: AIChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
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

      // Execute any actions
      if (result.actions?.length) {
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
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error('[AIChat] error:', err);
      const errorMsg: AIChatMessage = {
        id: `msg-${Date.now()}-err`,
        role: 'assistant',
        content: "Sorry, I couldn't connect. Try again?",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, actionCallbacks]);

  const handleNewChat = () => {
    setMessages([]);
    saveChatHistory([]); // Clear persisted history
    setInput('');
    haptic('light');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-card)]">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-[var(--accent-primary)]"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="flex items-center gap-1.5 text-[var(--text-primary)]">
          <Sparkles size={16} className="text-[var(--accent-primary)]" />
          <span className="text-sm font-semibold">AI Chat</span>
        </div>
        <button
          onClick={handleNewChat}
          className="text-[var(--accent-primary)]"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Sparkles size={32} className="mx-auto mb-3 text-[var(--text-tertiary)]" />
            <p className="text-sm text-[var(--text-tertiary)]">
              Ask me anything about your day, classes, or tasks.
            </p>
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
