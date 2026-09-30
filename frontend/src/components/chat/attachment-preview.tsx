import React from 'react';
import { X, FileText, Image as ImageIcon, Film } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AttachmentPreviewProps {
  file: File | { name: string; size: number; type: string; url?: string };
  onRemove?: () => void;
  className?: string;
}

export function AttachmentPreview({ file, onRemove, className }: AttachmentPreviewProps) {
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const previewUrl = 'url' in file && file.url ? file.url : file instanceof File ? URL.createObjectURL(file) : undefined;

  return (
    <div
      className={cn(
        'relative group flex items-center space-x-3 p-2.5 bg-slate-100/80 border border-slate-200/60 rounded-2xl max-w-xs',
        className,
      )}
    >
      <div className="w-12 h-12 rounded-xl bg-white border border-slate-200/80 overflow-hidden flex items-center justify-center shrink-0">
        {isImage && previewUrl ? (
          <img src={previewUrl} alt={file.name} className="w-full h-full object-cover" />
        ) : isVideo ? (
          <Film className="w-6 h-6 text-purple-500" />
        ) : isImage ? (
          <ImageIcon className="w-6 h-6 text-blue-500" />
        ) : (
          <FileText className="w-6 h-6 text-slate-500" />
        )}
      </div>

      <div className="flex-1 min-w-0 pr-6">
        <p className="text-xs font-semibold text-slate-800 truncate">{file.name}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{formatSize(file.size)}</p>
      </div>

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-2 right-2 w-5 h-5 rounded-full bg-slate-300 hover:bg-slate-400 text-white flex items-center justify-center transition"
          title="Remove attachment"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
