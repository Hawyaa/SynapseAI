"use client";
import { FileContent, formatBytes } from "@/lib/fileReader";

interface Props {
  file: FileContent;
  onRemove: () => void;
}

export function FileAttachment({ file, onRemove }: Props) {
  const icons: Record<string, string> = {
    pdf: "📄",
    text: "📝",
    csv: "📊",
    word: "📃",
    image: "🖼️",
    unknown: "📎",
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl max-w-xs">
      <span className="text-lg">{icons[file.type] ?? "📎"}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white truncate">{file.name}</p>
        <p className="text-xs text-white/30">{formatBytes(file.size)}</p>
      </div>
      {file.type === "image" && file.imageBase64 && (
        <img
          src={`data:${file.imageMimeType};base64,${file.imageBase64}`}
          alt={file.name}
          className="w-10 h-10 rounded-lg object-cover"
        />
      )}
      <button
        onClick={onRemove}
        className="text-white/30 hover:text-red-400 transition-colors text-sm flex-shrink-0"
      >
        ✕
      </button>
    </div>
  );
}