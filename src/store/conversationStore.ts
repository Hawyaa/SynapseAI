import { create } from "zustand";
import { Message } from "./chatStore";

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

interface ConversationState {
  conversations: Conversation[];
  activeId: string | null;
  createConversation: () => string;
  setActive: (id: string) => void;
  updateConversation: (id: string, messages: Message[]) => void;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  loadFromStorage: () => void;
  clearAll: () => void;
}

function save(convs: Conversation[]) {
  try {
    localStorage.setItem("localmind_conversations", JSON.stringify(convs));
  } catch {}
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversations: [],
  activeId: null,

  loadFromStorage: () => {
    try {
      const raw = localStorage.getItem("localmind_conversations");
      const conversations = raw ? JSON.parse(raw) : [];
      const cleaned = conversations.filter((c: Conversation) => c.messages.length > 0);
      save(cleaned);
      set({ conversations: cleaned });
    } catch {}
  },

  createConversation: () => {
    const id = crypto.randomUUID();
    set((s) => ({
      conversations: s.conversations,
      activeId: id,
    }));
    return id;
  },

  setActive: (id) => set({ activeId: id }),

  updateConversation: (id, messages) => {
    if (messages.length === 0) return;

    const existing = get().conversations.find(c => c.id === id);
    const firstUser = messages.find(m => m.role === "user");
    const title = firstUser
      ? firstUser.content.slice(0, 40) + (firstUser.content.length > 40 ? "…" : "")
      : "New conversation";

    let conversations: Conversation[];
    if (existing) {
      conversations = get().conversations.map(c =>
        c.id === id ? { ...c, messages, title, updatedAt: Date.now() } : c
      );
    } else {
      const newConv: Conversation = {
        id,
        title,
        messages,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      conversations = [newConv, ...get().conversations];
    }

    save(conversations);
    set({ conversations });
  },

  deleteConversation: (id) => {
    const conversations = get().conversations.filter(c => c.id !== id);
    save(conversations);
    const currentActive = get().activeId;
    const newActiveId = currentActive === id
      ? (conversations[0]?.id ?? null)
      : currentActive;
    set({ conversations, activeId: newActiveId });
  },

  renameConversation: (id, title) => {
    const conversations = get().conversations.map(c =>
      c.id === id ? { ...c, title } : c
    );
    save(conversations);
    set({ conversations });
  },

  clearAll: () => {
    try { localStorage.removeItem("localmind_conversations"); } catch {}
    set({ conversations: [], activeId: null });
  },
}));