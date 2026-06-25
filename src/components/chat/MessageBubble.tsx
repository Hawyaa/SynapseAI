"use client";
import { Message } from "@/store/chatStore";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface Props {
  message: Message;
  onEdit?: (id: string, newContent: string) => void;
  isLast?: boolean;
}

export function MessageBubble({ message, onEdit }: Props) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const isUser = message.role === "user";

  function copy() {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function startEdit() {
    setEditText(message.content);
    setEditing(true);
  }

  function cancelEdit() {
    setEditText(message.content);
    setEditing(false);
  }

  function confirmEdit() {
    if (editText.trim() && editText !== message.content) {
      onEdit?.(message.id, editText.trim());
    }
    setEditing(false);
  }

  return (
    <div className={`group flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center text-sm flex-shrink-0 mt-1">
          🧠
        </div>
      )}

      <div className={`relative max-w-[80%] ${isUser ? "order-first" : ""}`}>
        {editing ? (
          <div className="space-y-2">
            <textarea
              autoFocus
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); confirmEdit(); }
                if (e.key === "Escape") cancelEdit();
              }}
              className="w-full min-w-[280px] bg-white/10 border border-green-500/50 rounded-2xl px-4 py-3 text-sm text-white resize-none focus:outline-none"
              rows={Math.min(editText.split("\n").length + 1, 8)}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={cancelEdit}
                className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmEdit}
                className="text-xs px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-all"
              >
                Save & resend
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              isUser
                ? "bg-green-500/20 border border-green-500/30 text-white"
                : "bg-white/5 border border-white/10 text-white/90"
            }`}>
              {isUser ? (
                <p className="whitespace-pre-wrap">{message.content}</p>
              ) : (
                <ReactMarkdown
                  components={{
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "");
                      const inline = !match;
                      return inline ? (
                        <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                          {children}
                        </code>
                      ) : (
                        <SyntaxHighlighter
                          style={oneDark}
                          language={match[1]}
                          PreTag="div"
                          className="rounded-lg !mt-2 !mb-2 text-xs"
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      );
                    },
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                    strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              )}
            </div>

            {/* Action buttons */}
            <div className={`flex gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-all ${
              isUser ? "justify-end" : "justify-start"
            }`}>
              {isUser && onEdit && (
                <button
                  onClick={startEdit}
                  className="text-xs text-white/30 hover:text-white/70 px-2 py-1 rounded-lg hover:bg-white/5 transition-all flex items-center gap-1"
                >
                  ✏️ Edit
                </button>
              )}
              <button
                onClick={copy}
                className="text-xs text-white/30 hover:text-white/70 px-2 py-1 rounded-lg hover:bg-white/5 transition-all"
              >
                {copied ? "✓ copied" : "copy"}
              </button>
            </div>
          </>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-sm flex-shrink-0 mt-1">
          👤
        </div>
      )}
    </div>
  );
}