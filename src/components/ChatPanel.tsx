'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Message } from '@/lib/types';
import { useProjectStore } from '@/lib/stores/projectStore';
import { useUIStore } from '@/lib/stores/uiStore';
import { chat } from '@/lib/services/aiService';
import ChatMessage from './ChatMessage';
import styles from './ChatPanel.module.css';

const CONVERSATION_KEY = 'general';

export default function ChatPanel() {
  const [messageInput, setMessageInput] = useState('');
  const [isResponding, setIsResponding] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const currentProject = useProjectStore((s) => s.getCurrentProject());
  const isInMasterFolder = useUIStore((s) => s.isInMasterFolder);
  const addMessage = useProjectStore((s) => s.addMessage);
  const updateLastAssistantMessage = useProjectStore((s) => s.updateLastAssistantMessage);
  const removeLastMessage = useProjectStore((s) => s.removeLastMessage);
  const clearConversation = useProjectStore((s) => s.clearConversation);

  const conversation = currentProject?.generalConversation ?? null;

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (messagesRef.current) {
        messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      }
    }, 0);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (conversation?.messages) {
      scrollToBottom();
    }
  }, [conversation?.messages, scrollToBottom]);

  // Reset input height when cleared
  useEffect(() => {
    if (!messageInput && inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  }, [messageInput]);

  async function triggerAIResponse() {
    setIsResponding(true);

    const placeholderMessage: Message = {
      id: Math.random().toString(36).slice(2),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    addMessage(CONVERSATION_KEY, placeholderMessage);
    scrollToBottom();

    try {
      const projectId = currentProject?.id ?? '';
      const messages = (conversation?.messages ?? [])
        .filter((m) => !m.isStreaming && m.id !== placeholderMessage.id)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      let accumulated = '';
      await chat(messages, projectId, (chunk) => {
        accumulated += chunk;
      });

      updateLastAssistantMessage(CONVERSATION_KEY, accumulated);
      setLiveAnnouncement('Nudge replied');
      setTimeout(() => setLiveAnnouncement(''), 1000);
    } catch (err) {
      console.error('[Nudge] AI response error:', err);
      updateLastAssistantMessage(CONVERSATION_KEY, 'Something went quiet on my end.', {
        isError: true,
      });
    } finally {
      setIsResponding(false);
      scrollToBottom();
    }
  }

  async function sendMessage() {
    const text = messageInput.trim();
    if (!text || isResponding) return;

    setMessageInput('');
    resizeInput();

    const userMessage: Message = {
      id: Math.random().toString(36).slice(2),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    addMessage(CONVERSATION_KEY, userMessage);
    await triggerAIResponse();
  }

  async function retryLastMessage() {
    if (isResponding) return;
    removeLastMessage(CONVERSATION_KEY);
    await triggerAIResponse();
  }

  function resizeInput() {
    if (!inputRef.current) return;
    inputRef.current.style.height = 'auto';
    inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
  }

  function handleKeydown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const placeholder = isInMasterFolder
    ? "Go write. I'll be here when you need me."
    : 'Ask anything about your story\u2026';

  return (
    <div className={`${styles.chatPanel} ${isInMasterFolder ? styles.witness : ''}`}>
      {/* Screen-reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      {/* Header */}
      <div className={styles.panelHeader}>
        <button
          className={styles.clearBtn}
          onClick={() => clearConversation(CONVERSATION_KEY)}
          aria-label="Clear conversation"
        >
          ↺
        </button>
      </div>

      {/* Messages */}
      <div className={styles.messages} ref={messagesRef}>
        {!conversation || conversation.messages.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>
              Tell me about your project. What are you working on?
            </p>
          </div>
        ) : (
          <>
            {conversation.messages.map((message, i) => (
              <ChatMessage
                key={message.id}
                message={message}
                onRetry={
                  message.isError && i === conversation.messages.length - 1
                    ? retryLastMessage
                    : undefined
                }
              />
            ))}
            {isResponding && (
              <div className={styles.respondingHint}>Nudge is thinking&hellip;</div>
            )}
          </>
        )}
      </div>

      {isInMasterFolder && (
        <div className={styles.witnessOverlay}>
          <p className={styles.witnessTagline}>You&rsquo;ve got this.</p>
          <span className={styles.witnessRule} />
          <p className={styles.witnessSubtext}>
            Go write.
            <br />
            I&rsquo;ll be here when you need me.
          </p>
        </div>
      )}

      {/* Input area */}
      <div
        className={`${styles.inputArea} ${isInMasterFolder ? styles.witnessInput : ''}`}
      >
        <textarea
          ref={inputRef}
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyDown={handleKeydown}
          onInput={resizeInput}
          placeholder={placeholder}
          aria-label="Message"
          rows={1}
          disabled={isResponding}
        />
        <button
          className={styles.sendBtn}
          onClick={sendMessage}
          disabled={!messageInput.trim() || isResponding}
          aria-label="Send message"
        >
          ↑
        </button>
      </div>
    </div>
  );
}
