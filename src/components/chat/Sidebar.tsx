"use client";
import { useConversationStore } from "@/store/conversationStore";
import { useEffect, useState } from "react";

interface Props {
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ onSelectConversation, onNewChat, isOpen, onClose }: Props) {
  const { conversations, activeId, deleteConversation, renameConversation, loadFromStorage } = useConversationStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [mounted, setMounted] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadFromStorage();
    setMounted(true);
  }, []);

  function startRename(id: string, title: string) {
    setEditingId(id);
    setEditTitle(title);
  }

  function confirmRename(id: string) {
    if (editTitle.trim()) renameConversation(id, editTitle.trim());
    setEditingId(null);
  }

  function handleDelete(id: string) {
    if (confirmDeleteId === id) {
      deleteConversation(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  }

  function getDateLabel(timestamp: number): "today" | "yesterday" | "week" | "older" {
    const now = new Date();
    const date = new Date(timestamp);
    
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const weekStart = todayStart - 6 * 86400000;

    if (date.getTime() >= todayStart) return "today";
    if (date.getTime() >= yesterdayStart) return "yesterday";
    if (date.getTime() >= weekStart) return "week";
    return "older";
  }

  // Only show conversations with messages
  const validConvs = conversations.filter(c => c.messages.length > 0);

  const groups: Record<string, typeof validConvs> = {
    today: [],
    yesterday: [],
    week: [],
    older: [],
  };

  validConvs.forEach(c => {
    groups[getDateLabel(c.updatedAt)].push(c);
  });

  const groupLabels: Record<string, string> = {
    today: "Today",
    yesterday: "Yesterday",
    week: "Previous 7 days",
    older: "Older",
  };

  function formatTime(timestamp: number) {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  }

  function renderGroup(key: string) {
    const group = groups[key];
    if (!group.length) return null;
    return (
      <div key={key} className="mb-4">
        <p className="text-xs text-white/20 px-3 mb-1 uppercase tracking-wider font-medium">
          {groupLabels[key]}
        </p>
        {group.map(conv => (
          <div
            key={conv.id}
            className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
              activeId === conv.id
                ? "bg-white/10 text-white"
                : "text-white/50 hover:bg-white/5 hover:text-white/80"
            }`}
            onClick={() => onSelectConversation(conv.id)}
          >
            <span className="text-sm flex-shrink-0">💬</span>

            {editingId === conv.id ? (
              <input
                autoFocus
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onBlur={() => confirmRename(conv.id)}
                onKeyDown={e => {
                  if (e.key === "Enter") confirmRename(conv.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
                onClick={e => e.stopPropagation()}
                className="flex-1 bg-white/10 rounded px-2 py-0.5 text-xs text-white focus:outline-none border border-white/20"
              />
            ) : (
              <div className="flex-1 min-w-0">
                <p className="text-xs truncate">{conv.title}</p>
                {key === "today" && (
                  <p className="text-xs text-white/20">{formatTime(conv.updatedAt)}</p>
                )}
              </div>
            )}

            <div className="hidden group-hover:flex gap-1 flex-shrink-0">
              <button
                onClick={e => { e.stopPropagation(); startRename(conv.id, conv.title); }}
                className="text-white/30 hover:text-white/70 text-xs p-1 rounded hover:bg-white/10"
                title="Rename"
              >✏️</button>
              <button
                onClick={e => { e.stopPropagation(); handleDelete(conv.id); }}
                className={`text-xs p-1 rounded transition-all ${
                  confirmDeleteId === conv.id
                    ? "text-white bg-red-500 px-2"
                    : "text-white/30 hover:text-red-400 hover:bg-white/10"
                }`}
              >
                {confirmDeleteId === conv.id ? "Sure?" : "🗑"}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={onClose} />
      )}
      <aside className={`fixed md:relative top-0 left-0 h-full bg-[#0a0a0f] border-r border-white/10 flex flex-col z-30 transition-all duration-300 ${
        isOpen ? "w-64" : "w-0 overflow-hidden"
      }`}>
        <div className="p-3 border-b border-white/10 flex-shrink-0">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 text-sm font-medium transition-all whitespace-nowrap"
          >
            <span className="text-lg">+</span> New conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {!mounted ? null : validConvs.length === 0 ? (
            <p className="text-xs text-white/20 text-center mt-8 px-4">
              No conversations yet.<br />Start chatting!
            </p>
          ) : (
            <>
              {renderGroup("today")}
              {renderGroup("yesterday")}
              {renderGroup("week")}
              {renderGroup("older")}
            </>
          )}
        </div>

        <div className="p-3 border-t border-white/10 flex-shrink-0">
          <p className="text-xs text-white/20 text-center whitespace-nowrap">
            🧠 LocalMind · 100% Private
          </p>
        </div>
      </aside>
    </>
  );
}