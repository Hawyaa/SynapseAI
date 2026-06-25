"use client";
import { useState, useRef, KeyboardEvent } from "react";
import { readFile, FileContent } from "@/lib/fileReader";
import { FileAttachment } from "./FileAttachment";
import { toast } from "sonner";

interface Props {
  onSend: (text: string, file?: FileContent) => void;
  onStop?: () => void;
  isStreaming?: boolean;
  disabled: boolean;
  isVisionModel?: boolean;
}

export function InputBar({ onSend, onStop, isStreaming, disabled, isVisionModel }: Props) {
  const [text, setText] = useState("");
  const [attachedFile, setAttachedFile] = useState<FileContent | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error("File too large — max 20MB");
      return;
    }

    setLoadingFile(true);
    try {
      const content = await readFile(file);
      if (content.type === "unknown") {
        toast.error("File type not supported");
        return;
      }
      // Images are always allowed — text is extracted via OCR (Tesseract)
      // and used as context, even on non-vision text models.
      setAttachedFile(content);
      toast.success(`${file.name} attached`);
    } catch (err) {
      toast.error("Failed to read file");
    } finally {
      setLoadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function send() {
    const trimmed = text.trim();
    if ((!trimmed && !attachedFile) || disabled) return;
    onSend(trimmed || "What is in this file?", attachedFile ?? undefined);
    setText("");
    setAttachedFile(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function onInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }

  return (
    <div className="border-t border-white/10 bg-black/50 backdrop-blur-md p-4">
      {/* File preview */}
      {attachedFile && (
        <div className="max-w-3xl mx-auto mb-3">
          <FileAttachment
            file={attachedFile}
            onRemove={() => setAttachedFile(null)}
          />
        </div>
      )}

      <div className="max-w-3xl mx-auto flex gap-3 items-end">
        {/* Attach button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || loadingFile}
          title={isVisionModel ? "Attach image or file" : "Attach file (PDF, TXT, CSV, Word)"}
          className="w-10 h-10 rounded-xl border border-white/10 hover:bg-white/5 disabled:opacity-30 flex items-center justify-center transition-colors flex-shrink-0 text-white/40 hover:text-white"
        >
          {loadingFile ? (
            <span className="animate-spin text-sm">⟳</span>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.txt,.md,.csv,.json,.js,.ts,.py,.html,.css,.docx,.doc,image/*"
          onChange={handleFileChange}
        />

        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onInput={onInput}
          placeholder={
            disabled
              ? "Loading model…"
              : attachedFile
              ? "Ask something about this file… (or press send)"
              : isVisionModel
              ? "Message or attach an image… (Enter to send)"
              : "Message… (Enter to send, Shift+Enter for newline)"
          }
          disabled={disabled}
          rows={1}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-green-500/50 disabled:opacity-40 transition-colors"
        />

        {isStreaming ? (
          <button
            onClick={onStop}
            className="w-10 h-10 rounded-xl bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors flex-shrink-0 animate-pulse"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <rect x="4" y="4" width="16" height="16" rx="2"/>
            </svg>
          </button>
        ) : (
          <button
            onClick={send}
            disabled={disabled || (!text.trim() && !attachedFile)}
            className="w-10 h-10 rounded-xl bg-green-500 hover:bg-green-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z" />
            </svg>
          </button>
        )}
      </div>

      <p className="text-center text-xs text-white/20 mt-2">
        {isVisionModel
          ? "👁️ Vision mode · Supports images, PDF, TXT, CSV, Word · Private & offline"
          : "📎 Supports images (OCR), PDF, TXT, CSV, Word · Running locally · No data sent anywhere"}
      </p>
    </div>
  );
}