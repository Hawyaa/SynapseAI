"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DownloadProgress } from "@/components/chat/DownloadProgress";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { InputBar } from "@/components/chat/InputBar";
import { Sidebar } from "@/components/chat/Sidebar";
import { useModelStore } from "@/store/modelStore";
import { useChatStore } from "@/store/chatStore";
import { useConversationStore } from "@/store/conversationStore";
import { getEngine } from "@/lib/webllm";
import { MODELS } from "@/lib/models";
import { FileContent } from "@/lib/fileReader";
import Link from "next/link";

export default function Chat() {
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const {
    selectedModel, status,
    setSelectedModel, setStatus,
    setProgress, setError, reset,
  } = useModelStore();

  const {
    messages, isStreaming, systemPrompt,
    addMessage, updateMessage, setStreaming,
    stopGeneration, setAbortController,
  } = useChatStore();

  const {
    conversations, activeId,
    createConversation, setActive,
    updateConversation, loadFromStorage,
  } = useConversationStore();

  // Load saved conversations
  useEffect(() => { loadFromStorage(); }, []);

  // Auto-load last used model on startup
  useEffect(() => {
    const lastModel = localStorage.getItem("synapse_last_model");
    if (lastModel && status === "idle" && !initialLoadDone) {
      setInitialLoadDone(true);
      handleSelectModel(lastModel);
    }
  }, [status, initialLoadDone]);

  useEffect(() => {
    if (!activeId) {
      const id = createConversation();
      setActive(id);
    }
  }, []);

  useEffect(() => {
    if (!activeId) return;
    const conv = conversations.find(c => c.id === activeId);
    if (conv) useChatStore.setState({ messages: conv.messages });
  }, [activeId]);

  useEffect(() => {
    if (!activeId || messages.length === 0) return;
    updateConversation(activeId, messages);
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  function handleNewChat() {
    const id = createConversation();
    setActive(id);
    useChatStore.setState({ messages: [], activeFileContext: null });
  }

  function handleSelectConversation(id: string) {
    setActive(id);
    const conv = conversations.find(c => c.id === id);
    if (conv) useChatStore.setState({ messages: conv.messages, activeFileContext: null });
    setSidebarOpen(false);
  }

  async function handleSelectModel(modelId: string) {
    setShowModelPicker(false);
    setSelectedModel(modelId);
    reset();
    setStatus("downloading");
    setLoading(true);
    // Save the selected model to localStorage
    localStorage.setItem("synapse_last_model", modelId);
    try {
      await getEngine(modelId, (progress, text) => setProgress(progress, text));
      setStatus("ready");
      toast.success("Model loaded — ready to chat!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      toast.error("Failed to load model");
    } finally {
      setLoading(false);
    }
  }

  async function handleEditMessage(id: string, newContent: string) {
    const msgs = useChatStore.getState().messages;
    const idx = msgs.findIndex(m => m.id === id);
    if (idx === -1) return;
    // Keep messages up to and including the edited one, remove everything after
    const trimmed = msgs.slice(0, idx);
    useChatStore.setState({ messages: trimmed });
    // Resend with new content
    await handleSend(newContent);
  }

  async function handleSend(text: string, file?: FileContent) {
    if (!selectedModel || status !== "ready") {
      toast.error("Please select and load a model first");
      return;
    }

    let convId = activeId;
    if (!convId) {
      convId = createConversation();
      setActive(convId);
    }

    const ac = new AbortController();
    setAbortController(ac);

    // Store file context so ALL follow-up messages remember the file
    if (file?.text) {
      console.log("📄 FILE TEXT:", file.text);
      console.log("📄 FILE TEXT LENGTH:", file.text.length);
      console.log("📄 FILE TYPE:", file.type);
      console.log("📄 FILE NAME:", file.name);

      const context = `Extracted text from the file "${file.name}" (do not repeat this label or any bracket/marker text back to the user — just use the information):\n${file.text.slice(0, 8000)}`;
      useChatStore.getState().setActiveFileContext(context);
      console.log("📄 File context set:", context);
      console.log("📄 File text length:", file.text.length);
      console.log("📄 File type:", file.type);
    } else {
      console.log("❌ No file or no file.text");
    }

    // Show clean message to user, but send full content to model via system prompt
    addMessage({
      role: "user",
      content: file ? `📎 ${file.name}\n\n${text}` : text,
    });

    const assistantId = addMessage({ role: "assistant", content: "" });
    setStreaming(true);

    try {
      const engine = await getEngine(selectedModel, () => {});

      const allMessages = useChatStore.getState().messages;
      const history = allMessages
        .filter(m => m.id !== assistantId && m.content !== "")
        .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

      const saved = JSON.parse(localStorage.getItem("synapse_settings") ?? "{}");
      const temperature = saved.temperature ?? 0.7;
      const max_tokens = saved.maxTokens ?? 512;
      const currentSystemPrompt = useChatStore.getState().systemPrompt;
      const activeFileContext = useChatStore.getState().activeFileContext;

      console.log("🔍 activeFileContext from store:", activeFileContext);
      console.log("🔍 file object:", file);

      // Inject file into system prompt so every follow-up remembers it
      const fullSystemPrompt = activeFileContext
        ? `${currentSystemPrompt}\n\nIMPORTANT: The user has attached a file. Its full text content is provided below. You DO have access to this content — never say you cannot view, access, or see files, images, or attachments, that is false. Always answer directly using the text provided. Be concise: state plainly what the text says or shows, in as few words as the question needs. Do not add disclaimers, caveats, or requests for "more context" or "more detail" — if the extracted text is short, garbled, or just a word or two, simply report that directly (e.g. "The text reads: ...") without lecturing about needing additional information.\n\nThe user has shared a document. Here is the text content:\n${activeFileContext}\n\nAnswer any questions about this document content directly and helpfully.`
        : currentSystemPrompt;

      console.log("📝 fullSystemPrompt length:", fullSystemPrompt.length);
      console.log("📝 fullSystemPrompt preview:", fullSystemPrompt.slice(0, 500) + "...");

      const finalMessages = [
        { role: "system", content: fullSystemPrompt },
        ...history,
      ];

      // Small/weak models often ignore system-prompt context and fall back to a
      // trained "I can't view files" refusal. Reinforce by inlining the file
      // content directly into the latest user turn for the MODEL CALL ONLY —
      // the displayed chat message (and saved conversation history) stays unchanged.
      if (file?.text && finalMessages.length > 0) {
        const lastMsg = finalMessages[finalMessages.length - 1];
        if (lastMsg.role === "user") {
          lastMsg.content = `Here is the full text content of the attached file "${file.name}":\n\n${file.text.slice(0, 8000)}\n\nUsing the content above, answer this question directly and concisely (no disclaimers, no asking for more detail — if the text is short or unclear, just state plainly what it says): ${text}`;
        }
      }

      console.log("📨 finalMessages:", finalMessages);

      const stream = await engine.chat.completions.create({
        messages: finalMessages as any[],
        stream: true,
        temperature,
        max_tokens,
      });

      let full = "";
      let tokenCount = 0;

      for await (const chunk of stream) {
        if (ac.signal.aborted) break;
        const delta = chunk.choices[0]?.delta?.content ?? "";
        if (!delta) continue;
        full += delta;
        tokenCount++;
        if (tokenCount % 3 === 0) {
          updateMessage(assistantId, full);
          bottomRef.current?.scrollIntoView({ behavior: "instant" });
        }
      }

      updateMessage(assistantId, full || "_(stopped)_");

    } catch (err: any) {
      if (err?.name !== "AbortError" && !ac.signal.aborted) {
        updateMessage(assistantId, "Sorry, something went wrong. Please try again.");
        toast.error("Generation failed");
        console.error(err);
      }
    } finally {
      setStreaming(false);
      setAbortController(null);
    }
  }

  async function regenerate() {
    const msgs = useChatStore.getState().messages;
    const lastUser = [...msgs].reverse().find(m => m.role === "user");
    if (!lastUser) return;
    useChatStore.setState({ messages: msgs.slice(0, -1) });
    await handleSend(lastUser.content);
  }

  const currentModel = MODELS.find(m => m.id === selectedModel);
  const isVisionModel = currentModel?.vision === true;

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
      />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/80 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white/40 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              ☰
            </button>
            <Link
              href="/"
              className="text-white/40 hover:text-white text-sm transition-colors hidden sm:block"
            >
              ← Home
            </Link>

            {/* Model switcher */}
            <div className="relative">
              <button
                onClick={() => setShowModelPicker(!showModelPicker)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 border border-white/10 transition-all"
              >
                <span className="text-sm font-medium text-white">
                  {currentModel ? currentModel.name : "Select model"}
                </span>
                <svg
                  width="12" height="12" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.5"
                  className="text-white/40"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {showModelPicker && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-[#0f0f1a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-2">
                    <p className="text-xs text-white/30 px-3 py-2 uppercase tracking-wider">
                      Available models
                    </p>
                    {MODELS.map(m => (
                      <button
                        key={m.id}
                        onClick={() => handleSelectModel(m.id)}
                        className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                          selectedModel === m.id
                            ? "bg-green-500/10 border border-green-500/20"
                            : "hover:bg-white/5"
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-white">
                              {m.name}
                            </span>
                            {selectedModel === m.id && status === "ready" && (
                              <span className="text-xs text-green-400">✓ loaded</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-white/30">{m.size}</span>
                            <span className="text-xs text-white/30">· {m.description}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="px-4 py-2 border-t border-white/10 bg-white/[0.02]">
                    <p className="text-xs text-white/20">
                      📎 Supports PDF, TXT, CSV, Word · 🖼️ Images via OCR
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isStreaming && (
              <button
                onClick={stopGeneration}
                className="text-xs text-red-400 px-3 py-1.5 rounded-lg border border-red-500/30 hover:bg-red-500/10 transition-all animate-pulse"
              >
                ⬛ Stop
              </button>
            )}
            {messages.length > 0 && !isStreaming && (
              <button
                onClick={regenerate}
                className="text-xs text-white/40 hover:text-white/80 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-all"
              >
                ↻
              </button>
            )}
            <button
              onClick={handleNewChat}
              className="text-xs text-white/40 hover:text-white/80 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-all"
            >
              + New
            </button>
            <Link
              href="/settings"
              className="text-xs text-white/40 hover:text-white/80 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-all"
            >
              ⚙
            </Link>
          </div>
        </header>

        {/* Download progress */}
        {status === "downloading" && (
          <div className="p-4 border-b border-white/10 bg-black/40 flex-shrink-0">
            <div className="max-w-3xl mx-auto">
              <DownloadProgress />
            </div>
          </div>
        )}

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto"
          onClick={() => setShowModelPicker(false)}
        >
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

            {messages.length === 0 && status === "ready" && (
              <div className="text-center py-20">
                <div className="text-5xl mb-6">👋</div>
                <p className="text-2xl font-semibold text-white mb-2">
                  Hi! I'm Synapse.
                </p>
                <p className="text-sm text-white/40 mb-8">
                  Your private AI — no internet, no tracking, just you and me.
                </p>
                <button
                  onClick={() => handleSend("What can I help you with today?")}
                  className="px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 hover:border-white/20 transition-all text-white/60 hover:text-white/80 text-sm"
                >
                  💡 What can I help you with today?
                </button>
              </div>
            )}

            {messages.length === 0 && status === "downloading" && (
              <div className="text-center py-20">
                <div className="text-4xl mb-4 animate-pulse">🧠</div>
                <p className="text-lg font-medium text-white/50 mb-2">
                  Loading model from cache…
                </p>
                <p className="text-xs text-white/30">No internet needed · Ready in seconds</p>
              </div>
            )}

            {messages.length === 0 && status === "idle" && (
              <div className="text-center py-20 text-white/30">
                <div className="text-4xl mb-4">🧠</div>
                <p className="text-sm font-medium text-white/50 mb-2">
                  Select a model to get started
                </p>
                <p className="text-xs">Click the model name in the header above</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onEdit={handleEditMessage}
                isLast={i === messages.length - 1}
              />
            ))}

            {isStreaming && messages[messages.length - 1]?.content === "" && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center text-sm">
                  🧠
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        <InputBar
          onSend={handleSend}
          onStop={stopGeneration}
          isStreaming={isStreaming}
          disabled={loading || isStreaming || status !== "ready"}
          isVisionModel={isVisionModel}
        />
      </div>
    </div>
  );
}