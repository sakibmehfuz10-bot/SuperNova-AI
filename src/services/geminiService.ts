import { GoogleGenAI } from "@google/genai";

const DEFAULT_MODEL = "gemini-1.5-flash-8b";
const DEFAULT_TTS_MODEL = "gemini-1.5-flash"; // Flash model is best for audio generation

const SYSTEM_PROMPT = `
{name: "SuperNova AI", version: "2.1.0"}
# (Shortened for runtime; keep full JSON in dev)
`;

const INDIA_KNOWLEDGE_BASES =[
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
  role: "user" | "assistant"; 
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
   * Generate speech (TTS)
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
            parts:[{ text: `Please speak the following text:\n\n${text}` }],
          },
        ],
        config: {
          // Use string literal "AUDIO" to prevent enum export issues
          responseModalities: ["AUDIO"], 
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

      // Extract Base64 Audio natively
      const parts = candidate.content?.parts ||[];
      for (const p of parts) {
        if (p.inlineData?.data) {
          base64Audio = p.inlineData.data;
          break;
        }
      }

      if (!base64Audio) {
        console.warn("No audio payload found in TTS response", candidate);
        return null;
      }

      return `data:audio/wav;base64,${base64Audio}`;
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
      systemInstruction, 
      tools:[],
    };

    // Note: Gemini doesn't have a built-in 'urlContext' tool. 
    // If you need it to read a URL, you should enable googleSearch or pass the URL body in the prompt.
    if (options.mode === "research") {
      config.tools.push({ googleSearch: {} });
    }

    const contents: any[] =[];

    // Map history -> user/model
    for (const m of history ||[]) {
      contents.push({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      });
    }

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

      // The SDK provides a convenient .text getter that stitches parts together automatically
      let text = response.text;

      if (!text) {
        text = "I'm sorry — I couldn't generate a response.";
      }

      // Handle Google Search Grounding Metadata
      const candidate = response?.candidates?.[0];
      const chunks = candidate?.groundingMetadata?.groundingChunks ||[];
      
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
