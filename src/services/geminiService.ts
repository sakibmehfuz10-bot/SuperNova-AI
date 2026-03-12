// GeminiService.fixed.corrected.ts
import { GoogleGenAI, ThinkingLevel, Modality } from "@google/genai";

/**
 * পরিবর্তনের মূল নোটস (সংক্ষেপে)
 * - DEFAULT_MODEL: "gemini-1.5-flash-8b"
 * - DEFAULT_TTS_MODEL: "gemini-1.5-flash" (flash সিরিজ অডিও-উপযোগী)
 * - history role mapping: non-user -> "model"
 * - systemInstruction is sent via config only (no 'system' role item in contents)
 */

const DEFAULT_MODEL = "gemini-1.5-flash-8b";
const DEFAULT_TTS_MODEL = "gemini-1.5-flash"; // flash model recommended for audio

const SYSTEM_PROMPT = `
{name: "SuperNova AI", version: "2.1.0"}
# (Shortened for runtime; keep full JSON in dev)
`;

const INDIA_KNOWLEDGE_BASES = [
  "https://www.india.gov.in",
  "https://pib.gov.in",
  "https://www.rbi.org.in",
  "https://www.isro.gov.in",
  "https://www.meity.gov.in",
  "https://www.investindia.gov.in",
  "https://www.mygov.in",
  "https://www.ncert.nic.in",
  "https://www.nta.ac.in",
  "https://www.upsc.gov.in",
  "https://www.digitalindia.gov.in",
  "https://www.startupindia.gov.in"
];

export type Message = {
  id: string;
  role: "user" | "assistant"; // keep shape as your app uses; we'll map non-user to "model"
  content: string;
  time: string;
  isThinking?: boolean;
  artifact?: string;
};

export class GeminiService {
  private ai: GoogleGenAI;
  private apiKey: string;

  constructor() {
    this.apiKey =
      (import.meta.env as any).VITE_GEMINI_API_KEY ||
      (import.meta.env as any).GEMINI_API_KEY ||
      "";
    console.log("Using API Key:", this.apiKey ? "Found" : "Missing");
    if (!this.apiKey) {
      console.warn(
        "Gemini API key is missing. Please set VITE_GEMINI_API_KEY or GEMINI_API_KEY."
      );
    }
    this.ai = new GoogleGenAI({ apiKey: this.apiKey });
  }

  /**
   * Generate speech (TTS) — model is configurable; handle multiple response shapes robustly.
   * NOTE: Confirm the exact TTS model name with the SDK docs for your account/region.
   */
  async generateSpeech(
    text: string,
    voiceName: "Puck" | "Charon" | "Kore" | "Fenrir" | "Zephyr" = "Kore",
    opts?: { model?: string }
  ) {
    const ttsModel = opts?.model || DEFAULT_TTS_MODEL;

    try {
      const response = await this.ai.models.generateContent({
        model: ttsModel,
        contents: [
          {
            role: "user",
            parts: [{ text: `Please speak the following text:\n\n${text}` }],
          },
        ],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const candidate = response?.candidates?.[0];
      if (!candidate) return null;

      let base64Audio: string | undefined;

      try {
        const parts =
          (candidate.content && candidate.content.parts) || candidate.parts || [];
        for (const p of parts) {
          if (p.inlineData?.data) {
            base64Audio = p.inlineData.data;
            break;
          }
        }
      } catch (e) {
        // ignore and try other shapes
      }

      if (!base64Audio && (candidate as any).inlineAudio?.data) {
        base64Audio = (candidate as any).inlineAudio.data;
      }

      if (!base64Audio && (candidate as any).audio?.content) {
        base64Audio = (candidate as any).audio.content;
      }

      if (!base64Audio) {
        console.warn("No audio payload found in TTS response", candidate);
        return null;
      }

      const mime = "audio/wav";
      return `data:${mime};base64,${base64Audio}`;
    } catch (error: any) {
      console.error("TTS Error:", error?.message ?? error);
      throw new Error(
        `TTS failed: ${error?.message ?? "unknown error"}. Check model/access.`
      );
    }
  }

  /**
   * Chat / generate text (general)
   */
  async chat(
    message: string,
    history: Message[],
    options: {
      model?: string;
      mode?: "research" | "url" | "simple";
      useThinking?: boolean;
      depth?: string;
      tone?: string;
      format?: string;
      image?: { data: string; mimeType: string };
      npcPersona?: string;
    } = {}
  ) {
    const modelName = options.model || DEFAULT_MODEL;

    let systemInstruction = options.npcPersona || SYSTEM_PROMPT;
    systemInstruction +=
      "\n\nCRITICAL: Keep responses concise and within reasonable token limits.";

    const config: any = {
      systemInstruction, // send system prompt here — DO NOT duplicate as a 'system' role in contents
      tools: [],
    };

    if (options.mode === "research") {
      config.tools.push({ googleSearch: {} });
    } else if (options.mode === "url") {
      config.tools.push({ urlContext: {} });
    } else {
      // simple/no external tools to avoid quota/tool clashes
    }

    // Build contents: only include history (mapped) and the current user message.
    const contents: any[] = [];

    // Map history -> user/model (map any non-user to "model" to match Gemini SDK)
    for (const m of history || []) {
      contents.push({
        role: m.role === "user" ? "user" : "model", // <<--- FIXED: map assistant -> model
        parts: [{ text: m.content }],
      });
    }

    // Current user message; if no history, include India knowledge bases as context
    const userParts: any[] = [{ text: message }];
    if (!history || history.length === 0) {
      userParts[0].text = `Context: Ground your response in these knowledge bases where applicable: ${INDIA_KNOWLEDGE_BASES.join(
        ", "
      )}\n\nQuery: ${message}`;
    }

    if (options.image) {
      userParts.push({
        inlineData: {
          data: options.image.data,
          mimeType: options.image.mimeType,
        },
      });
    }

    contents.push({ role: "user", parts: userParts });

    try {
      const response = await this.ai.models.generateContent({
        model: modelName,
        contents,
        config,
      });

      let text = "";
      const candidate = response?.candidates?.[0] || null;

      if (candidate?.content) {
        const parts = candidate.content.parts || [];
        text = parts.map((p: any) => p.text || "").join("\n");
      }

      if (!text && response?.text) text = response.text;

      if (!text && candidate?.output?.[0]?.content) {
        text = candidate.output.map((o: any) => o.content || "").join("\n");
      }

      if (!text) {
        text = "I'm sorry — I couldn't generate a response.";
      }

      const chunks =
        candidate?.groundingMetadata?.groundingChunks ||
        candidate?.grounding?.chunks ||
        [];
      if (chunks && chunks.length > 0) {
        const sources = chunks
          .filter((c: any) => c.web?.uri)
          .map((c: any) => `* ${c.web.title || c.web.uri} — ${c.web.uri}`)
          .join("\n");
        if (sources) {
          text += `\n\n---\nSources:\n${sources}`;
        }
      }

      return text;
    } catch (error: any) {
      console.error("Gemini API Error:", error?.message ?? error);
      throw new Error(
        `Gemini API Error: ${error?.message ?? "unknown error"}. Check API key, model name, and tool permissions.`
      );
    }
  }
  }
