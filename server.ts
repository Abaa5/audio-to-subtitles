import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Set up server-side request body parsers with a high limit for larger media files (up to 100MB)
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

let aiInstance: GoogleGenAI | null = null;

// Lazy initialization of the Gemini SDK client
function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please configure your API key in Settings > Secrets.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Clean markdown codes from response string
function cleanSRT(content: string): string {
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    // Remove opening code block line
    cleaned = cleaned.replace(/^```[a-zA-Z0-9-]*\r?\n/, "");
    // Remove closing code block
    cleaned = cleaned.replace(/\r?\n```$/, "");
  }
  return cleaned.trim();
}

// API endpoint for subtitle generation
app.post("/api/generate-subtitles", async (req, res) => {
  try {
    const { fileData, mimeType, targetLanguage, extraContext } = req.body;

    if (!fileData || !mimeType) {
      res.status(400).json({ error: "Missing required fields: fileData and mimeType are mandatory." });
      return;
    }

    // Strip out base64 prefixes if present (e.g. "data:video/mp4;base64,")
    const base64Data = fileData.replace(/^data:.*?;base64,/, "");

    const ai = getAI();

    const filePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data,
      }
    };

    const promptText = `You are a professional audiovisual subtitling expert. 
The uploaded file is a video or audio media file. 
Analyze the spoken audio track in detail. 
Transcribe the exact speech and translate/adapt it into highly accurate, structured, and natural ${targetLanguage || "Arabic"} subtitles.

You MUST format the output as a strict, standard SubRip (.srt) subtitle file.
Guidelines for each SRT block:
1. Sequential entry ID (starting from 1).
2. Proper time format: HH:MM:SS,mmm --> HH:MM:SS,mmm
3. Subtitle text in ${targetLanguage || "Modern Standard Arabic"} (Arabic keyboard characters, clean, correct grammar).
4. Synchronize the start/end times with the real moments when the words are spoken in the file.
5. Create entries regularly to avoid huge text blocks.

IMPORTANT: Respond ONLY with the raw SRT text content. Do NOT wrap the output in markdown blocks (like \`\`\`srt) or include any introductory/concluding chat commentary. Only return valid SubRip content.

${extraContext ? `Context or hints for help: ${extraContext}` : ""}`;

    const talkPart = {
      text: promptText,
    };

    // Query 'gemini-3.5-flash' for multimodal text/audio/video processing
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [filePart, talkPart] },
    });

    const srtText = cleanSRT(response.text || "");

    res.json({ srtText });
  } catch (error: any) {
    console.error("Transcription error:", error);
    res.status(500).json({ 
      error: error.message || "فشلت عملية توليد الترجمة بالذكاء الاصطناعي. الرجاء التحقق من صحة الملف وإعدادات مفتاح API."
    });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV });
});

// Custom global error-handling middleware to catch body-parser (e.g. Payload Too Large) and other Express errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Global Express Error:", err);
  if (res.headersSent) {
    return next(err);
  }
  
  const status = err.status || err.statusCode || 500;
  let customMessage = err.message || "حدث خطأ غير متوقع في الخادم.";
  
  if (status === 413) {
    customMessage = "الملف المرفوع كبير جداً وتجاوز الحد الأقصى للمخدم (100 ميغابايت). الرجاء استخدام ملف ميديا أصغر حجماً.";
  }
  
  res.status(status).json({
    error: customMessage,
    code: err.code || "SERVER_ERROR",
    details: process.env.NODE_ENV !== "production" ? err.stack || err : undefined
  });
});

// Setup Vite Dev server middleware or static directory serving
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

setupServer();
