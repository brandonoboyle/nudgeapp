'use client';

import { useMemo } from 'react';
import type { Message } from '@/lib/types';
import styles from './ChatMessage.module.css';

interface ChatMessageProps {
  message: Message;
  onRetry?: () => void;
}

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/\n\n+/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatMessage({ message, onRetry }: ChatMessageProps) {
  const html = useMemo(() => renderMarkdown(message.content), [message.content]);

  const messageClass = [
    styles.message,
    message.role === 'user' ? styles.user : styles.assistant,
  ].join(' ');

  return (
    <div className={messageClass}>
      {message.role === 'assistant' && <div className={styles.avatar}>N</div>}
      <div className={styles.bubble}>
        <div className={styles.content}>
          {message.isStreaming && message.content === '' ? (
            <span className={styles.thinking}>
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
            </span>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: html }} />
          )}
        </div>
        <time className={styles.timestamp}>{formatTime(message.timestamp)}</time>
        {message.isError && onRetry && (
          <button className={styles.retryBtn} onClick={onRetry}>
            ↺ Try again
          </button>
        )}
      </div>
    </div>
  );
}
