"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [gpuStatus, setGpuStatus] = useState<"checking"|"supported"|"unsupported">("checking");
  const [gpuName, setGpuName] = useState("");

  useEffect(() => {
    async function check() {
      if (!(navigator as any).gpu) { setGpuStatus("unsupported"); return; }
      try {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (!adapter) { setGpuStatus("unsupported"); return; }
        const info = await adapter.requestAdapterInfo?.();
        setGpuName(info?.description || "");
        setGpuStatus("supported");
      } catch { setGpuStatus("unsupported"); }
    }
    check();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-bold text-lg">🧠 Synapse </span>
          <div className="flex gap-1">
            {[["Chat","/chat"],["Benchmark","/benchmark"],["Settings","/settings"]].map(([label,href])=>(
              <Link key={href} href={href}
                className="px-4 py-1.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors">
                {label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 pt-24 pb-16 text-center">
        {/* GPU badge */}
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-10 border ${
          gpuStatus === "supported"
            ? "border-green-500/30 bg-green-500/5 text-green-400"
            : gpuStatus === "unsupported"
            ? "border-red-500/30 bg-red-500/5 text-red-400"
            : "border-white/10 bg-white/5 text-white/40"
        }`}>
          {gpuStatus === "checking" && <><span className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full inline-block" /> Checking WebGPU…</>}
          {gpuStatus === "supported" && <><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> WebGPU ready — offline AI enabled {gpuName && `· ${gpuName}`}</>}
          {gpuStatus === "unsupported" && <><span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" /> WebGPU not detected — use Chrome 113+</>}
        </div>

        <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight mb-5 leading-tight">
          AI that runs<br />
          <span className="bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
          offline.
          </span>
        </h1>
        <p className="text-lg text-white/50 max-w-xl mx-auto mb-10">
          Chat with Llama, Phi, and Gemma — no server, no subscription, no data ever leaving your device.
        </p>
        <div className="flex gap-3 justify-center flex-wrap mb-16">
          <Link href="/chat"
            className="px-6 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold transition-colors shadow-lg shadow-green-500/20">
            Start chatting →
          </Link>
          <Link href="/benchmark"
            className="px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 font-medium transition-colors">
            Run benchmark
          </Link>
        </div>

        <div className="flex gap-12 justify-center flex-wrap">
          {[["100%","Private"],["0$","Per message"],["3","Models"],].map(([n,l])=>(
            <div key={l} className="text-center">
              <div className="text-3xl font-black tracking-tight">{n}</div>
              <div className="text-xs text-white/40 mt-1">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {gpuStatus === "unsupported" && (
        <div className="max-w-6xl mx-auto px-6 pb-8">
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
            <p className="font-semibold text-red-400 mb-2">⚠ WebGPU is not available</p>
            <p className="text-sm text-white/50 leading-relaxed">
              Open this page in <strong className="text-white/80">Google Chrome 113+</strong> on desktop.<br />
              Or go to <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">chrome://flags/#enable-unsafe-webgpu</code> and enable it.
            </p>
          </div>
        </div>
      )}

      <footer className="border-t border-white/5 p-6 text-center text-xs text-white/20">
      Synapse · Runs 100% in your browser · No servers · No subscriptions
      </footer>
    </main>
  );
}