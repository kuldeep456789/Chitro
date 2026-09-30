'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/lib/auth-context';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');

let globalSocket: Socket | null = null;

export function useSocket() {
  const { token } = useAuth();
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    if (!globalSocket || !globalSocket.connected) {
      globalSocket = io(SOCKET_URL, {
        auth: { token },
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });
    }

    socketRef.current = globalSocket;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    globalSocket.on('connect', onConnect);
    globalSocket.on('disconnect', onDisconnect);

    if (globalSocket.connected) setConnected(true);

    return () => {
      globalSocket?.off('connect', onConnect);
      globalSocket?.off('disconnect', onDisconnect);
    };
  }, [token]);

  const subscribeToConversation = (conversationId: string) => {
    socketRef.current?.emit('conversation:subscribe', { conversationId });
  };

  const sendMessage = (conversationId: string, text: string, clientMessageId: string) => {
    return new Promise<any>((resolve, reject) => {
      if (!socketRef.current?.connected) {
        reject(new Error('Not connected'));
        return;
      }
      socketRef.current.emit('message:send', { conversationId, text, clientMessageId }, (ack: any) => {
        if (ack?.success) resolve(ack.message);
        else reject(new Error(ack?.error || 'Send failed'));
      });
    });
  };

  const sendTyping = (conversationId: string, isTyping: boolean) => {
    socketRef.current?.emit(isTyping ? 'typing:start' : 'typing:stop', { conversationId });
  };

  const onMessage = (handler: (msg: any) => void): (() => void) => {
    globalSocket?.on('message:new', handler);
    return () => { globalSocket?.off('message:new', handler); };
  };

  const onTyping = (handler: (data: any) => void): (() => void) => {
    globalSocket?.on('typing:updated', handler);
    return () => { globalSocket?.off('typing:updated', handler); };
  };

  const onPresence = (handler: (data: any) => void): (() => void) => {
    globalSocket?.on('presence:updated', handler);
    return () => { globalSocket?.off('presence:updated', handler); };
  };

  const onConversationNew = (handler: (data: any) => void): (() => void) => {
    globalSocket?.on('conversation:new', handler);
    return () => { globalSocket?.off('conversation:new', handler); };
  };

  const onConnectionRequest = (handler: (data: any) => void): (() => void) => {
    globalSocket?.on('connection:new_request', handler);
    return () => { globalSocket?.off('connection:new_request', handler); };
  };

  const onConnectionAccepted = (handler: (data: any) => void): (() => void) => {
    globalSocket?.on('connection:accepted', handler);
    return () => { globalSocket?.off('connection:accepted', handler); };
  };

  const markConversationRead = (conversationId: string, messageId?: string) => {
    socketRef.current?.emit('conversation:read', { conversationId, messageId });
  };

  const onConversationRead = (handler: (data: any) => void): (() => void) => {
    globalSocket?.on('conversation:read', handler);
    return () => { globalSocket?.off('conversation:read', handler); };
  };

  const onGroupUpdated = (handler: (data: any) => void): (() => void) => {
    globalSocket?.on('group:updated', handler);
    return () => { globalSocket?.off('group:updated', handler); };
  };

  const initiateCall = (conversationId: string, targetUserId: string, callType: 'audio' | 'video') => {
    socketRef.current?.emit('call:initiate', { conversationId, targetUserId, callType });
  };

  const sendCallSignal = (conversationId: string, targetUserId: string, signal: any) => {
    socketRef.current?.emit('call:signal', { conversationId, targetUserId, signal });
  };

  const acceptCall = (conversationId: string, callerId: string) => {
    socketRef.current?.emit('call:accept', { conversationId, callerId });
  };

  const rejectCall = (conversationId: string, callerId: string, reason?: string) => {
    socketRef.current?.emit('call:reject', { conversationId, callerId, reason });
  };

  const hangupCall = (conversationId: string, targetUserId: string) => {
    socketRef.current?.emit('call:hangup', { conversationId, targetUserId });
  };

  const onCallIncoming = (handler: (data: any) => void): (() => void) => {
    globalSocket?.on('call:incoming', handler);
    return () => { globalSocket?.off('call:incoming', handler); };
  };

  const onCallSignal = (handler: (data: any) => void): (() => void) => {
    globalSocket?.on('call:signal', handler);
    return () => { globalSocket?.off('call:signal', handler); };
  };

  const onCallAccepted = (handler: (data: any) => void): (() => void) => {
    globalSocket?.on('call:accepted', handler);
    return () => { globalSocket?.off('call:accepted', handler); };
  };

  const onCallRejected = (handler: (data: any) => void): (() => void) => {
    globalSocket?.on('call:rejected', handler);
    return () => { globalSocket?.off('call:rejected', handler); };
  };

  const onCallEnded = (handler: (data: any) => void): (() => void) => {
    globalSocket?.on('call:ended', handler);
    return () => { globalSocket?.off('call:ended', handler); };
  };

  return {
    socket: socketRef.current,
    connected,
    subscribeToConversation,
    sendMessage,
    sendTyping,
    markConversationRead,
    onMessage,
    onTyping,
    onPresence,
    onConversationNew,
    onConversationRead,
    onGroupUpdated,
    onConnectionRequest,
    onConnectionAccepted,
    initiateCall,
    sendCallSignal,
    acceptCall,
    rejectCall,
    hangupCall,
    onCallIncoming,
    onCallSignal,
    onCallAccepted,
    onCallRejected,
    onCallEnded,
  };
}
