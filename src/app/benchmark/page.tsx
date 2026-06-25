"use client";
import { useState } from "react";
import { useModelStore } from "@/store/modelStore";
import { getEngine } from "@/lib/webllm";
import { MODELS } from "@/lib/models";
import { toast } from "sonner";
import Link from "next/link";

interface BenchmarkResult {
  modelId: string;
  modelName: string;
  tokensPerSecond: number;
  timeToFirstToken: number;
  totalTime: number;
  totalTokens: number;
}

const TEST_PROMPTS = [
  "What is 2 + 2?",
  "Name the planets in our solar system.",
  "Write a haiku about the ocean.",
  "What is the capital of France?",
  "Explain gravity in one sentence.",
];

export default function Benchmark() {
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [running, setRunning] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [progress, setProgress] = useState(0);
  const { selectedModel, status } = useModelStore();

  async function runBenchmark() {
    if (status !== "ready" || !selectedModel) {
      toast.error("Please load a model in the Chat page first");
      return;
    }

    setRunning(true);
    setResults([]);
    setProgress(0);

    const modelName = MODELS.find(m => m.id === selectedModel)?.name ?? selectedModel;

    try {
      const engine = await getEngine(selectedModel, () => {});
      let totalTokens = 0;
      let firstTokenTime = 0;
      const startAll = performance.now();

      for (let i = 0; i < TEST_PROMPTS.length; i++) {
        const prompt = TEST_PROMPTS[i];
        setCurrentPrompt(prompt);
        setProgress(Math.round((i / TEST_PROMPTS.length) * 100));

        const start = performance.now();
        let gotFirstToken = false;
        let tokenCount = 0;

        const stream = await engine.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          stream: true,
          max_tokens: 100,
          temperature: 0.1,
        });

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (delta && !gotFirstToken) {
            firstTokenTime += performance.now() - start;
            gotFirstToken = true;
          }
          if (delta) tokenCount++;
        }

        totalTokens += tokenCount;
      }

      setProgress(100);
      const totalMs = performance.now() - startAll;

      const result: BenchmarkResult = {
        modelId: selectedModel,
        modelName,
        tokensPerSecond: Math.round((totalTokens / totalMs) * 1000),
        timeToFirstToken: Math.round(firstTokenTime / TEST_PROMPTS.length),
        totalTime: Math.round(totalMs),
        totalTokens,
      };

      setResults([result]);
      toast.success("Benchmark complete!");
    } catch (err) {
      toast.error("Benchmark failed");
      console.error(err);
    } finally {
      setRunning(false);
      setCurrentPrompt("");
    }
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "synapse-benchmark.json";
    a.click();
  }

  function exportCSV() {
    const headers = "Model,Tokens/sec,Time to first token (ms),Total time (ms),Total tokens";
    const rows = results.map(r =>
      `${r.modelName},${r.tokensPerSecond},${r.timeToFirstToken},${r.totalTime},${r.totalTokens}`
    );
    const blob = new Blob([[headers, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "synapse-benchmark.csv";
    a.click();
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 border-b border-white/10 bg-black/80 backdrop-blur-md px-6 py-4 flex items-center gap-4">
        <Link href="/chat" className="text-white/40 hover:text-white text-sm transition-colors">
          ← Back to chat
        </Link>
        <span className="text-white/20">|</span>
        <span className="font-semibold">📊 Benchmark</span>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">

        <section>
          <h2 className="text-lg font-semibold mb-1">Performance Benchmark</h2>
          <p className="text-sm text-white/40">
            Runs {TEST_PROMPTS.length} test prompts on the currently loaded model and measures speed.
            Load a model in Chat first.
          </p>
        </section>

        <div className="border border-white/10 rounded-2xl p-5 bg-white/[0.02] flex items-center justify-between">
          <div>
            <p className="text-xs text-white/40 mb-1">Currently loaded model</p>
            <p className="text-sm font-medium">
              {status === "ready"
                ? MODELS.find(m => m.id === selectedModel)?.name ?? selectedModel
                : "No model loaded"}
            </p>
          </div>
          <div className={`w-2 h-2 rounded-full ${status === "ready" ? "bg-green-400 animate-pulse" : "bg-white/20"}`} />
        </div>

        <section>
          <h3 className="text-sm font-medium text-white/60 mb-3">Test prompts</h3>
          <div className="space-y-2">
            {TEST_PROMPTS.map((p, i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm transition-all ${
                running && currentPrompt === p
                  ? "border-green-500/40 bg-green-500/5 text-white"
                  : "border-white/5 bg-white/[0.02] text-white/50"
              }`}>
                <span className="text-xs text-white/20 font-mono">{i + 1}</span>
                {p}
                {running && currentPrompt === p && (
                  <span className="ml-auto text-xs text-green-400 animate-pulse">running…</span>
                )}
              </div>
            ))}
          </div>
        </section>

        <button
          onClick={runBenchmark}
          disabled={running || status !== "ready"}
          className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-colors"
        >
          {running ? `Running… ${progress}%` : "▶ Run benchmark"}
        </button>

        {running && (
          <div className="w-full bg-white/10 rounded-full h-1.5">
            <div
              className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {results.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white/60">Results</h3>
              <div className="flex gap-2">
                <button onClick={exportJSON}
                  className="text-xs text-white/40 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-all">
                  Export JSON
                </button>
                <button onClick={exportCSV}
                  className="text-xs text-white/40 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-all">
                  Export CSV
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {results.map(r => (
                <div key={r.modelId} className="border border-white/10 rounded-2xl p-6 bg-white/[0.02] space-y-5">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{r.modelName}</p>
                    <span className="text-xs text-green-400 border border-green-500/20 px-2 py-1 rounded-full">
                      {r.tokensPerSecond} tok/s
                    </span>
                  </div>

                  {[
                    { label: "Tokens / second", value: r.tokensPerSecond, max: 200, unit: "tok/s", good: true },
                    { label: "Time to first token", value: r.timeToFirstToken, max: 5000, unit: "ms", good: false },
                    { label: "Total time", value: r.totalTime, max: 60000, unit: "ms", good: false },
                  ].map(({ label, value, max, unit, good }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-white/50">{label}</span>
                        <span className="text-white font-mono">{value.toLocaleString()} {unit}</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-700 ${good ? "bg-green-500" : "bg-blue-500"}`}
                          style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-400">{r.tokensPerSecond}</p>
                      <p className="text-xs text-white/30 mt-1">tokens / second</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-400">{r.timeToFirstToken}ms</p>
                      <p className="text-xs text-white/30 mt-1">first token latency</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {status !== "ready" && (
          <div className="border border-yellow-500/20 bg-yellow-500/5 rounded-xl p-4 text-center">
            <p className="text-sm text-yellow-400/80">
              Load a model in{" "}
              <Link href="/chat" className="underline hover:text-yellow-300">Chat</Link>{" "}
              first, then come back to run the benchmark.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}