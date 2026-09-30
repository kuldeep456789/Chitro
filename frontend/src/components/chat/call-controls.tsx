import React from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CallControlsProps {
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeakerOn?: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleSpeaker?: () => void;
  onEndCall: () => void;
  className?: string;
}

export function CallControls({
  isMuted,
  isVideoOff,
  isSpeakerOn = true,
  onToggleMute,
  onToggleVideo,
  onToggleSpeaker,
  onEndCall,
  className,
}: CallControlsProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center space-x-4 p-4 bg-slate-900/90 backdrop-blur-md rounded-3xl shadow-xl',
        className,
      )}
    >
      <button
        type="button"
        onClick={onToggleMute}
        className={cn(
          'w-12 h-12 rounded-2xl flex items-center justify-center transition active:scale-95',
          isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white hover:bg-white/20',
        )}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>

      <button
        type="button"
        onClick={onToggleVideo}
        className={cn(
          'w-12 h-12 rounded-2xl flex items-center justify-center transition active:scale-95',
          isVideoOff ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white hover:bg-white/20',
        )}
        title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
      >
        {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
      </button>

      {onToggleSpeaker && (
        <button
          type="button"
          onClick={onToggleSpeaker}
          className={cn(
            'w-12 h-12 rounded-2xl flex items-center justify-center transition active:scale-95',
            !isSpeakerOn ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-white hover:bg-white/20',
          )}
          title={isSpeakerOn ? 'Mute Speaker' : 'Speaker On'}
        >
          {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      )}

      <button
        type="button"
        onClick={onEndCall}
        className="w-12 h-12 rounded-2xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-600/30 transition active:scale-95"
        title="End Call"
      >
        <PhoneOff className="w-5 h-5" />
      </button>
    </div>
  );
}
