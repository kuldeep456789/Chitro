'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { useSocket } from './useSocket';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  clientMessageId?: string;
  createdAt: string;
  sender: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
  };
}

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const { subscribeToConversation, sendMessage: socketSend, onMessage, sendTyping } = useSocket();
  const optimisticIdsRef = useRef<Set<string>>(new Set());

  // Load history
  const loadHistory = useCallback(async (before?: string) => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const url = `/conversations/${conversationId}/messages?limit=30${before ? `&before=${before}` : ''}`;
      const history: Message[] = await apiClient(url);
      if (before) {
        setMessages((prev) => [...history, ...prev]);
      } else {
        setMessages(history);
      }
      setHasMore(history.length === 30);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // Subscribe to room and load initial history
  useEffect(() => {
    if (!conversationId) return;
    setMessages([]);
    setHasMore(true);
    subscribeToConversation(conversationId);
    loadHistory();
  }, [conversationId]);

  // Real-time listener
  useEffect(() => {
    if (!conversationId) return;
    const cleanup = onMessage((msg: Message) => {
      if (msg.conversationId !== conversationId) return;
      setMessages((prev) => {
        // Replace optimistic message if matches clientMessageId
        if (msg.clientMessageId && optimisticIdsRef.current.has(msg.clientMessageId)) {
          optimisticIdsRef.current.delete(msg.clientMessageId);
          return prev.map((m) => (m.clientMessageId === msg.clientMessageId ? msg : m));
        }
        // Avoid duplicates
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });
    return cleanup;
  }, [conversationId]);

  const sendMessage = async (text: string, senderId: string) => {
    if (!conversationId || !text.trim()) return;

    const clientMessageId = `cli_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Optimistic update
    const optimistic: Message = {
      id: `optimistic_${clientMessageId}`,
      conversationId,
      senderId,
      text: text.trim(),
      clientMessageId,
      createdAt: new Date().toISOString(),
      sender: { id: senderId, displayName: 'You', username: '' },
    };
    optimisticIdsRef.current.add(clientMessageId);
    setMessages((prev) => [...prev, optimistic]);

    try {
      await socketSend(conversationId, text.trim(), clientMessageId);
    } catch {
      // Remove optimistic on failure
      setMessages((prev) => prev.filter((m) => m.clientMessageId !== clientMessageId));
      optimisticIdsRef.current.delete(clientMessageId);
    }
  };

  return { messages, loading, hasMore, loadHistory, sendMessage, sendTyping };
}
