export interface FileContent {
  name: string;
  type: "pdf" | "text" | "csv" | "word" | "image" | "unknown";
  text?: string;
  imageBase64?: string;
  imageMimeType?: string;
  size: number;
}

export async function readFile(file: File): Promise<FileContent> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const size = file.size;

  // IMAGE
  if (file.type.startsWith("image/")) {
    try {
      const text = await extractTextFromImage(file);
      const base64 = await toBase64(file);
      return { name: file.name, type: "image", text, imageBase64: base64, imageMimeType: file.type, size };
    } catch {
      return { name: file.name, type: "image", text: "(Could not read image)", size };
    }
  }

  // PDF
  if (ext === "pdf") {
    const text = await readPDF(file);
    return { name: file.name, type: "pdf", text, size };
  }

  // Word
  if (ext === "docx" || ext === "doc") {
    const text = await readWord(file);
    return { name: file.name, type: "word", text, size };
  }

  // Text files
  if (["txt", "md", "csv", "json", "js", "ts", "py", "html", "css"].includes(ext)) {
    const text = await file.text();
    return { name: file.name, type: ext === "csv" ? "csv" : "text", text, size };
  }

  return { name: file.name, type: "unknown", size };
}

async function extractTextFromImage(file: File): Promise<string> {
  try {
    const Tesseract = await import("tesseract.js");
    const preprocessedUrl = await preprocessImageForOCR(file);
    const result = await Tesseract.recognize(preprocessedUrl, "eng", {
      logger: () => {},
      workerPath: "/tesseract/worker.min.js",
      corePath: "/tesseract/tesseract-core.wasm.js",
      langPath: "/tesseract",
    });
    if (preprocessedUrl.startsWith("blob:")) URL.revokeObjectURL(preprocessedUrl);
    const cleaned = result.data.text
      .split("\n")
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 2)
      .join("\n")
      .trim();
    return cleaned || "(No readable text found in image)";
  } catch (err) {
    console.error("OCR error:", err);
    return "(Could not extract text from image)";
  }
}

async function preprocessImageForOCR(file: File): Promise<string> {
  const imageUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(imageUrl);
    const scale = img.width < 1200 ? 2 : 1;
    const canvas = document.createElement("canvas");
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return imageUrl;

    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = data.data;
    for (let i = 0; i < px.length; i += 4) {
      const gray = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
      const boosted = Math.min(255, Math.max(0, (gray - 128) * 1.3 + 128));
      px[i] = px[i + 1] = px[i + 2] = boosted;
    }
    ctx.putImageData(data, 0, 0);

    return canvas.toDataURL("image/png");
  } catch {
    return imageUrl;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface PdfTextItem {
  str: string;
}

async function readPDF(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = "";

  for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: PdfTextItem) => item.str).join(" ");
    text += `\n--- Page ${i} ---\n${pageText}`;
  }

  return text.trim();
}

async function readWord(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function buildFileContext(file: FileContent): string {
  return `Extracted text from the file "${file.name}" (do not repeat this label or any bracket/marker text back to the user — just use the information):\n${file.text}`;
}