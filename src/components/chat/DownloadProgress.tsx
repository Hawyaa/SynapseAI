"use client";
import { useModelStore } from "@/store/modelStore";

export function DownloadProgress() {
  const status = useModelStore((s) => s.status);
  const progress = useModelStore((s) => s.progress);
  const progressText = useModelStore((s) => s.progressText);
  const error = useModelStore((s) => s.error);

  if (status === "idle") return null;

  return (
    <div className="space-y-2">
      {status === "downloading" && (
        <>
          <div className="flex justify-between text-xs text-white/40">
            <span>{progressText || "Loading model..."}</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5">
            <div
              className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: progress + "%" }}
            />
          </div>
        </>
      )}
      {status === "ready" && (
        <p className="text-green-400 text-sm">Model ready</p>
      )}
      {status === "error" && (
        <p className="text-red-400 text-sm">{error}</p>
      )}
    </div>
  );
}
