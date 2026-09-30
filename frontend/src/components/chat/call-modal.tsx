'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Volume2, User, Loader2 } from 'lucide-react';
import { CallControls } from './call-controls';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  targetUser: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
  };
  callType: 'audio' | 'video';
  isIncoming?: boolean;
  onInitiateCall: (targetUserId: string, callType: 'audio' | 'video') => void;
  onSendSignal: (targetUserId: string, signal: any) => void;
  onAcceptCall: (callerId: string) => void;
  onRejectCall: (callerId: string) => void;
  onHangupCall: (targetUserId: string) => void;
  onCallSignal: (handler: (data: any) => void) => () => void;
  onCallAccepted: (handler: (data: any) => void) => () => void;
  onCallRejected: (handler: (data: any) => void) => () => void;
  onCallEnded: (handler: (data: any) => void) => () => void;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function CallModal({
  isOpen,
  onClose,
  conversationId,
  targetUser,
  callType,
  isIncoming = false,
  onInitiateCall,
  onSendSignal,
  onAcceptCall,
  onRejectCall,
  onHangupCall,
  onCallSignal,
  onCallAccepted,
  onCallRejected,
  onCallEnded,
}: CallModalProps) {
  const [callState, setCallState] = useState<'ringing' | 'connected' | 'ended'>(
    isIncoming ? 'ringing' : 'ringing',
  );
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [duration, setDuration] = useState(0);
  const [statusMessage, setStatusMessage] = useState(
    isIncoming ? 'Incoming call...' : 'Calling...',
  );

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean shutdown
  const endCall = (notify = true) => {
    if (notify) {
      if (isIncoming && callState === 'ringing') {
        onRejectCall(targetUser.id);
      } else {
        onHangupCall(targetUser.id);
      }
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setCallState('ended');
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  // Start outgoing call
  useEffect(() => {
    if (!isOpen) return;

    if (!isIncoming) {
      // Outgoing call initialization
      setStatusMessage('Calling...');
      onInitiateCall(targetUser.id, callType);
      startMediaAndPeer(true);
    }

    // Call Accepted listener
    const cleanupAccepted = onCallAccepted(() => {
      setCallState('connected');
      setStatusMessage('Connected');
      startDurationTimer();
    });

    // Call Rejected listener
    const cleanupRejected = onCallRejected((data: any) => {
      setStatusMessage(data.reason === 'busy' ? 'User is busy' : 'Call declined');
      setTimeout(() => endCall(false), 1500);
    });

    // Call Ended listener
    const cleanupEnded = onCallEnded(() => {
      setStatusMessage('Call ended');
      endCall(false);
    });

    // WebRTC Signaling listener
    const cleanupSignal = onCallSignal(async (data: any) => {
      if (data.senderId !== targetUser.id) return;
      const { signal } = data;
      const pc = pcRef.current;
      if (!pc) return;

      try {
        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          onSendSignal(targetUser.id, answer);
          setCallState('connected');
          setStatusMessage('Connected');
          startDurationTimer();
        } else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
        } else if (signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.error('Signaling error:', err);
      }
    });

    return () => {
      cleanupAccepted();
      cleanupRejected();
      cleanupEnded();
      cleanupSignal();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, isIncoming]);

  const startDurationTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setDuration(0);
    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  };

  const startMediaAndPeer = async (isCaller: boolean) => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callType === 'video' ? { width: 640, height: 480, facingMode: 'user' } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current && callType === 'video') {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      // Add local tracks to peer connection
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Handle remote tracks
      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          onSendSignal(targetUser.id, { candidate: event.candidate });
        }
      };

      if (isCaller) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        onSendSignal(targetUser.id, offer);
      }
    } catch (err) {
      console.error('Media stream error:', err);
      setStatusMessage('Microphone/Camera access required');
    }
  };

  const handleAcceptIncoming = async () => {
    onAcceptCall(targetUser.id);
    await startMediaAndPeer(false);
  };

  const handleToggleMute = () => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const handleToggleVideo = () => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
    }
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between p-6 animate-fade-in text-white select-none">
      {/* Top Bar with user info & duration */}
      <div className="flex flex-col items-center pt-8 z-10">
        <h2 className="text-xl font-bold text-white tracking-wide">{targetUser.displayName}</h2>
        <p className="text-xs text-slate-400 mt-1 font-medium">
          {callState === 'connected' ? formatDuration(duration) : statusMessage}
        </p>
      </div>

      {/* Main Call View */}
      <div className="flex-1 flex flex-col items-center justify-center relative w-full my-6">
        {/* Remote Video (if video call and connected) */}
        {callType === 'video' && callState === 'connected' ? (
          <div className="w-full h-full relative rounded-3xl overflow-hidden bg-slate-900 border border-white/10 shadow-2xl">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Local Video PiP */}
            <div className="absolute top-4 right-4 w-28 h-40 rounded-2xl overflow-hidden bg-slate-800 border-2 border-white/20 shadow-xl">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        ) : (
          /* Audio Call or Ringing Avatar View */
          <div className="flex flex-col items-center">
            <div className="relative">
              {/* Pulsing ring waves during ringing */}
              {callState === 'ringing' && (
                <>
                  <div className="absolute -inset-4 rounded-full bg-blue-500/20 animate-ping" />
                  <div className="absolute -inset-8 rounded-full bg-indigo-500/10 animate-pulse" />
                </>
              )}
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-4xl shadow-2xl shadow-blue-500/30">
                {targetUser.displayName[0]?.toUpperCase() || 'U'}
              </div>
            </div>

            {callType === 'video' && callState === 'ringing' && (
              <p className="text-xs text-blue-400 mt-6 flex items-center space-x-1.5 font-medium">
                <Video className="w-4 h-4" />
                <span>Video Call</span>
              </p>
            )}
            {callType === 'audio' && (
              <p className="text-xs text-slate-400 mt-6 flex items-center space-x-1.5 font-medium">
                <Phone className="w-4 h-4" />
                <span>Audio Call</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="pb-8 z-10 w-full flex justify-center">
        {/* Incoming Call Answer/Decline Actions */}
        {isIncoming && callState === 'ringing' ? (
          <div className="flex items-center space-x-12">
            <button
              onClick={() => endCall(true)}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white shadow-xl shadow-red-600/40 active:scale-95 transition"
              title="Decline"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <button
              onClick={handleAcceptIncoming}
              className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-white shadow-xl shadow-emerald-500/40 active:scale-95 transition animate-bounce"
              title="Accept"
            >
              {callType === 'video' ? <Video className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
            </button>
          </div>
        ) : (
          /* Active Call Controls */
          <CallControls
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            onToggleMute={handleToggleMute}
            onToggleVideo={handleToggleVideo}
            onEndCall={() => endCall(true)}
            className="w-full max-w-xs"
          />
        )}
      </div>
    </div>
  );
}
