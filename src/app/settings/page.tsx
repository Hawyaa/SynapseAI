"use client";
import { useState, useEffect } from "react";
import { useChatStore } from "@/store/chatStore";
import { useConversationStore } from "@/store/conversationStore";
import { toast } from "sonner";
import Link from "next/link";

export default function Settings() {
  const [mounted, setMounted] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(512);
  const [contextSize, setContextSize] = useState(0);
  const { systemPrompt, setSystemPrompt } = useChatStore();
  const { conversations, clearAll } = useConversationStore();

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("localmind_settings");
      if (saved) {
        const s = JSON.parse(saved);
        setTemperature(s.temperature ?? 0.7);
        setMaxTokens(s.maxTokens ?? 512);
      }
      const raw = localStorage.getItem("localmind_conversations") ?? "";
      setContextSize(new Blob([raw]).size);
    } catch {}
  }, []);

  function saveSettings() {
    localStorage.setItem("localmind_settings", JSON.stringify({ temperature, maxTokens }));
    toast.success("Settings saved!");
  }

  function clearHistory() {
    clearAll();
    toast.success("Conversation history cleared");
  }

  function formatBytes(b: number) {
    if (b < 1024) return b + " B";
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
    return (b / (1024 * 1024)).toFixed(1) + " MB";
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 border-b border-white/10 bg-black/80 backdrop-blur-md px-6 py-4 flex items-center gap-4">
        <Link href="/chat" className="text-white/40 hover:text-white text-sm transition-colors">
          ← Back to chat
        </Link>
        <span className="text-white/20">|</span>
        <span className="font-semibold">⚙️ Settings</span>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">

        {/* Generation */}
        <section>
          <h2 className="text-lg font-semibold mb-1">Generation</h2>
          <p className="text-sm text-white/40 mb-5">Control how the AI generates responses</p>
          <div className="space-y-6 border border-white/10 rounded-2xl p-6 bg-white/[0.02]">

            <div>
              <div className="flex justify-between mb-2">
                <div>
                  <p className="text-sm font-medium">Temperature</p>
                  <p className="text-xs text-white/40">Lower = focused · Higher = creative</p>
                </div>
                <span className="text-sm font-mono text-green-400">{temperature.toFixed(1)}</span>
              </div>
              <input
                type="range" min="0.1" max="1.5" step="0.1"
                value={temperature}
                onChange={e => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-green-500 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-white/20 mt-1">
                <span>0.1 — Precise</span>
                <span>1.5 — Creative</span>
              </div>
            </div>

            <div className="border-t border-white/10 pt-6">
              <div className="flex justify-between mb-2">
                <div>
                  <p className="text-sm font-medium">Max response length</p>
                  <p className="text-xs text-white/40">Lower = faster · Higher = longer answers</p>
                </div>
                <span className="text-sm font-mono text-green-400">{maxTokens} tokens</span>
              </div>    
              <input
                type="range" min="64" max="2048" step="64"
                value={maxTokens}
                onChange={e => setMaxTokens(parseInt(e.target.value))}
                className="w-full accent-green-500 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-white/20 mt-1">
                <span>64 — Fast</span>
                <span>2048 — Long</span>
              </div>
            </div>

          </div>
        </section>

        {/* System Prompt */}
        <section>
          <h2 className="text-lg font-semibold mb-1">System Prompt</h2>
          <p className="text-sm text-white/40 mb-5">Tell the AI how to behave in every conversation</p>
          <div className="border border-white/10 rounded-2xl p-6 bg-white/[0.02]">
            <textarea
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              rows={5}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-green-500/50 transition-colors"
              placeholder="You are a helpful AI assistant..."
            />
            <button
              onClick={() => setSystemPrompt("You are a helpful, honest, and friendly AI assistant running entirely in the user's browser. You have no internet access. Be concise but thorough. Use markdown when helpful. If unsure, say so.")}
              className="mt-2 text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              ↺ Reset to default
            </button>
          </div>
        </section>

        {/* Storage */}
        <section>
          <h2 className="text-lg font-semibold mb-1">Storage</h2>
          <p className="text-sm text-white/40 mb-5">Manage your local data</p>
          <div className="border border-white/10 rounded-2xl p-6 bg-white/[0.02] space-y-5">

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Conversation history</p>
                <p className="text-xs text-white/40 mt-0.5">
                  {conversations.length} conversation{conversations.length !== 1 ? "s" : ""} · {formatBytes(contextSize)}
                </p>
              </div>
              <button
                onClick={clearHistory}
                className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/10 transition-all"
              >
                Clear all
              </button>
            </div>

            <div className="border-t border-white/10 pt-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Cached AI models</p>
                <p className="text-xs text-white/40 mt-0.5">Stored in your browser — safe to clear</p>
              </div>
              <button
                onClick={async () => {
                  try {
                    const keys = await caches.keys();
                    await Promise.all(keys.map(k => caches.delete(k)));
                    toast.success("Model cache cleared — models will re-download next use");
                  } catch {
                    toast.error("Could not clear cache");
                  }
                }}
                className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/10 transition-all"
              >
                Clear models
              </button>
            </div>

          </div>
        </section>

        {/* About */}
        <section>
          <h2 className="text-lg font-semibold mb-1">About</h2>
          <div className="border border-white/10 rounded-2xl p-6 bg-white/[0.02] space-y-3">
            {[
              ["App", "LocalMind"],
              ["Version", "1.0.0"],
              ["Engine", "@mlc-ai/web-llm"],
              ["Privacy", "100% local — zero data sent to any server"],
              ["Cost", "Free forever"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-white/40">{k}</span>
                <span className="text-white/80 text-right">{v}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Save */}
        <button
          onClick={saveSettings}
          className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold transition-colors shadow-lg shadow-green-500/20"
        >
          Save settings
        </button>

        <p className="text-center text-xs text-white/20 pb-6">
          Settings are stored locally in your browser
        </p>
      </div>
    </div>
  );
}