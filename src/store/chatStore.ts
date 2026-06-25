import { create } from "zustand";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  systemPrompt: string;
  activeFileContext: string | null;
  abortController: AbortController | null;
  addMessage: (msg: Omit<Message, "id" | "timestamp">) => string;
  updateMessage: (id: string, content: string) => void;
  setStreaming: (v: boolean) => void;
  setAbortController: (ac: AbortController | null) => void;
  stopGeneration: () => void;
  clearMessages: () => void;
  setSystemPrompt: (p: string) => void;
  setActiveFileContext: (ctx: string | null) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isStreaming: false,
  activeFileContext: null,
  abortController: null,
  systemPrompt: "You are a helpful, honest, and friendly AI assistant running entirely in the user's browser. You have no internet access. Be concise but thorough. Use markdown when helpful. If unsure, say so.",

  addMessage: (msg) => {
    const id = crypto.randomUUID();
    set((s) => ({
      messages: [...s.messages, { ...msg, id, timestamp: Date.now() }],
    }));
    return id;
  },

  updateMessage: (id, content) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, content } : m)),
    })),

  setStreaming: (isStreaming) => set({ isStreaming }),

  setAbortController: (abortController) => set({ abortController }),

  stopGeneration: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
      set({ abortController: null, isStreaming: false });
    }
  },

  clearMessages: () => set({ messages: [], activeFileContext: null }),

  setSystemPrompt: (systemPrompt) => set({ systemPrompt }),

  setActiveFileContext: (activeFileContext) => set({ activeFileContext }),
}));