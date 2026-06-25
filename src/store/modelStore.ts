import { create } from "zustand";

interface ModelState {
  selectedModel: string | null;
  status: "idle" | "downloading" | "ready" | "error";
  progress: number;
  progressText: string;
  error: string | null;
  setSelectedModel: (id: string) => void;
  setStatus: (s: ModelState["status"]) => void;
  setProgress: (p: number, text: string) => void;
  setError: (e: string) => void;
  reset: () => void;
}

export const useModelStore = create<ModelState>((set) => ({
  selectedModel: null,
  status: "idle",
  progress: 0,
  progressText: "",
  error: null,
  setSelectedModel: (id) => set({ selectedModel: id }),
  setStatus: (status) => set({ status }),
  setProgress: (progress, progressText) => set({ progress, progressText }),
  setError: (error) => set({ status: "error", error }),
  reset: () => set({ status: "idle", progress: 0, progressText: "", error: null }),
}));