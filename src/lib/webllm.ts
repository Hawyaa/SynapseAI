import { CreateMLCEngine, MLCEngine } from "@mlc-ai/web-llm";

let engine: MLCEngine | null = null;
let loadedModelId: string | null = null;

export async function getEngine(
  modelId: string,
  onProgress: (progress: number, text: string) => void
): Promise<MLCEngine> {
  if (engine && loadedModelId === modelId) return engine;

  if (engine) {
    try { await (engine as MLCEngine & { unload?: () => Promise<void> }).unload?.(); } catch {}
    engine = null;
  }

  engine = await CreateMLCEngine(modelId, {
    initProgressCallback: (report) => {
      onProgress(Math.round(report.progress * 100), report.text);
    },
  });

  loadedModelId = modelId;
  return engine;
}

export function getLoadedModelId() { return loadedModelId; }
export function isModelLoaded(modelId: string) { return loadedModelId === modelId && engine !== null; }