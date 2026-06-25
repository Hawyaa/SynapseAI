"use client";
import { MODELS } from "@/lib/models";
import { useModelStore } from "@/store/modelStore";

interface Props {
  onSelect: (modelId: string) => void;
  disabled: boolean;
}

export function ModelSelector({ onSelect, disabled }: Props) {
  const selectedModel = useModelStore((s) => s.selectedModel);

  return (
    <div className="space-y-2">
      <label className="text-sm text-white/60">Select model</label>
      <select
        style={{ backgroundColor: "#1a1a2e", color: "#ffffff" }}
        className="w-full border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500/50 disabled:opacity-50"
        value={selectedModel ?? ""}
        onChange={(e) => onSelect(e.target.value)}
        disabled={disabled}
      >
        <option style={{ backgroundColor: "#1a1a2e", color: "#ffffff" }} value="" disabled>
          Choose a model…
        </option>
        {MODELS.map((m) => (
          <option
            key={m.id}
            value={m.id}
            style={{ backgroundColor: "#1a1a2e", color: "#ffffff" }}
          >
            {m.name} — {m.size}
          </option>
        ))}
      </select>
    </div>
  );
}