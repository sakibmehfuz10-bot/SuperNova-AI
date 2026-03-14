Import { GoogleGenAI, Modality } from "@google/genai";

// ============================================
// CONFIGURATION
// ============================================

const SYSTEM_PROMPT = `
You are SuperNova AI (v2.1.0) — The Ultimate Intelligence Orchestrator.

## Role & Mission
A world-class AI assistant engineered for precision, depth, and actionable insight, with deep specialization in the Indian subcontinent. Your mission is to empower human potential by delivering accurate, structured, and insight-rich responses.

## Tone
Professional yet warm. Analytical yet accessible. Like a senior engineer and trusted mentor combined.

## India Intelligence Specializations
- **Education**: CBSE, ICSE, State Boards, JEE, NEET, UPSC, GATE, CAT preparation
- **Law & Governance**: Constitution of India, IPC, CrPC, BNS, BNSS, BSA
- **Economy & Business**: Indian startup ecosystem, GST, Digital India, UPI, PLI schemes
- **Culture & Language**: Indian culture, traditions, Hindi, Bengali, Tamil, etc.
- **Geography & Infrastructure**: Gati Shakti, Smart Cities, major projects

## Communication Rules
1. ALWAYS respond in the same language the user writes in
2. Use clean Markdown formatting
3. NEVER use "As an AI..." or similar phrases
4. Be direct — lead with the answer, then provide context
5. Cite sources for statistics (especially from Indian government portals)
6. Include TL;DR at TOP for long responses

## Response Format
- **Standard Query**: TL;DR → Main Answer → Supporting Details → Next Steps
- **Technical Query**: TL;DR → Code Block → Explanation → Edge Cases → How to Run
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
] as const;

// ============================================
// TYPES
// ============================================

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
  isThinking?: boolean;
  artifact?: string;
};

type VoiceName = "Puck" | "Charon" | "Kore" | "Fenrir" | "Zephyr";

interface ChatOptions {
  model?: string;
  mode?: "research" | "default";
  useThinking?: boolean;
  depth?: string;
  tone?: string;
  format?: string;
  image?: { data: string; mimeType: string };
  npcPersona?: string;
}

interface ContentPart {
  text?: string;
  inlineData?: {
    data: string;
    mimeType: string;
  };
}

interface ChatContent {
  role: "user" | "model";
  parts: ContentPart[];
}

// ============================================
// GEMINI SERVICE
// ============================================

export class GeminiService {
  // ✅ Gemini 1.5 Flash - Free tier compatible model
  private readonly DEFAULT_MODEL = "gemini-1.5-flash";
  
  // Alternative free models (if needed):
  // - "gemini-1.5-flash-latest" (latest stable)
  // - "gemini-1.5-flash-8b" (faster, smaller)
  // - "gemini-2.0-flash" (newer, check availability)

  private getAI(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
    
    if (!apiKey) {
      throw new Error(
        "Gemini API key is missing. Please set GEMINI_API_KEY environment variable."
      );
    }
    
    return new GoogleGenAI({ apiKey });
  }

  /**
   * Text-to-Speech generation
   */
  async generateSpeech(
    text: string, 
    voiceName: VoiceName = "Kore"
  ): Promise<string | null> {
    try {
      const ai = this.getAI();
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const base64Audio = 
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (base64Audio) {
        return `data:audio/wav;base64,${base64Audio}`;
      }
      
      console.warn("TTS: No audio data in response");
      return null;
      
    } catch (error) {
      console.error("TTS Error:", error);
      throw new Error(
        `Speech generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Main chat function
   */
  async chat(
    message: string,
    history: Message[],
    options: ChatOptions = {}
  ): Promise<string> {
    
    // ✅ Use gemini-1.5-flash (free tier)
    const modelName = options.model || this.DEFAULT_MODEL;

    // Build system instruction
    const systemInstruction = this.buildSystemInstruction(options);

    // Build config
    const config = this.buildConfig(systemInstruction, options.mode);

    // Build conversation contents
    const contents = this.buildContents(message, history, options);

    try {
      const ai = this.getAI();
      
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config,
      });

      return this.processResponse(response);
      
    } catch (error) {
      console.error("Gemini API Error:", error);
      
      // Provide helpful error message
      if (error instanceof Error) {
        if (error.message.includes("quota")) {
          throw new Error("API quota exceeded. Please try again later.");
        }
        if (error.message.includes("invalid")) {
          throw new Error("Invalid API key. Please check your GEMINI_API_KEY.");
        }
      }
      
      throw new Error(
        `Chat generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Build system instruction string
   */
  private buildSystemInstruction(options: ChatOptions): string {
    let instruction = options.npcPersona || SYSTEM_PROMPT;
    
    instruction += "\n\nCRITICAL: Keep responses concise, well-structured, and within reasonable token limits.";

    if (!options.npcPersona && (options.depth || options.tone || options.format)) {
      instruction += "\n\nOutput Constraints:";
      if (options.depth) instruction += `\n- Depth: ${options.depth}`;
      if (options.tone) instruction += `\n- Tone: ${options.tone}`;
      if (options.format) instruction += `\n- Format: ${options.format}`;
    }

    return instruction;
  }

  /**
   * Build generation config
   */
  private buildConfig(systemInstruction: string, mode?: string) {
    const tools: any[] = [];

    // Add tools based on mode
    if (mode === "research") {
      tools.push({ googleSearch: {} });
    } else {
      // Default mode: both search and URL context
      tools.push({ googleSearch: {} }, { urlContext: {} });
    }

    return {
      systemInstruction,
      tools,
      // Optional: Add generation parameters
      // temperature: 0.7,
      // maxOutputTokens: 8192,
      // topP: 0.95,
    };
  }

  /**
   * Build conversation contents array
   */
  private buildContents(
    message: string,
    history: Message[],
    options: ChatOptions
  ): ChatContent[] {
    
    // Convert history to Gemini format
    const contents: ChatContent[] = history.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    // Build current message parts
    const currentParts: ContentPart[] = [];

    // Add text with optional context
    if (history.length === 0) {
      // First message: include knowledge base context
      currentParts.push({
        text: `Context: Ground your response using these knowledge bases where applicable: ${INDIA_KNOWLEDGE_BASES.join(", ")}\n\nQuery: ${message}`,
      });
    } else {
      currentParts.push({ text: message });
    }

    // Add image if provided
    if (options.image) {
      currentParts.push({
        inlineData: {
          data: options.image.data,
          mimeType: options.image.mimeType,
        },
      });
    }

    contents.push({ role: "user", parts: currentParts });

    return contents;
  }

  /**
   * Process and format response
   */
  private processResponse(response: any): string {
    let text = response.text || "I'm sorry, I couldn't generate a response.";

    // Extract grounding sources
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (chunks?.length > 0) {
      const sources = chunks
        .filter((c: any) => c.web?.uri)
        .map((c: any) => `* [${c.web.title || c.web.uri}](${c.web.uri})`)
        .join("\n");

      if (sources) {
        text += `\n\n---\n**Sources:**\n${sources}`;
      }
    }

    return text;
  }
}

// ============================================
// USAGE EXAMPLE
// ============================================

/*
const gemini = new GeminiService();

// Simple chat
const response = await gemini.chat(
  "JEE Main 2025 এর সিলেবাস কী?",
  [],
  { mode: "research" }
);

// With image
const responseWithImage = await gemini.chat(
  "এই ছবিতে কী আছে?",
  [],
  { 
    image: { 
      data: base64ImageData, 
      mimeType: "image/jpeg" 
    } 
  }
);

// Text-to-Speech
const audioUrl = await gemini.generateSpeech("হ্যালো, আমি SuperNova AI");
*/


