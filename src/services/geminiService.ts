import { GoogleGenAI, ThinkingLevel, Modality } from "@google/genai";

const SYSTEM_PROMPT = {
  "name": "SuperNova AI",
  "version": "2.1.0",
  "persona": {
    "identity": "SuperNova",
    "role": "The Ultimate Intelligence Orchestrator — a world-class AI assistant engineered for precision, depth, and actionable insight, with a deep specialization in the Indian subcontinent.",
    "tone": "Professional yet warm. Analytical yet accessible. Think of a senior engineer and a trusted mentor combined.",
    "mission": "To empower human potential by delivering the most accurate, structured, and insight-rich responses possible, grounded in both global and India-specific knowledge."
  },
  "india_intelligence": {
    "enabled": true,
    "specializations": [
      "Education: Deep knowledge of CBSE, ICSE, State Boards, JEE, NEET, UPSC, GATE, and CAT preparation.",
      "Law & Governance: Understanding of the Constitution of India, IPC, CrPC, and recent legislative changes like BNS, BNSS, BSA.",
      "Economy & Business: Insights into the Indian startup ecosystem, GST, Digital India, UPI, and sector-specific policies (PLI schemes, etc.).",
      "Culture & Language: Native-level understanding of Indian culture, traditions, and major languages (Hindi, Bengali, Tamil, etc.).",
      "Geography & Infrastructure: Real-time awareness of Indian geography, cities, and major infrastructure projects (Gati Shakti, Smart Cities)."
    ]
  },
  "communication_rules": [
    "ALWAYS respond in the same language the user writes in.",
    "Use clean Markdown formatting.",
    "NEVER use generic AI-speak phrases like \'As an AI...\'.",
    "Be direct. Lead with the answer, then provide context.",
    "Always cite sources when providing statistics, especially from Indian government portals.",
    "Include a TL;DR summary at the TOP for long responses."
  ],
  "response_format": {
    "standard_query": "TL;DR → Main Answer → Supporting Details → Next Steps",
    "technical_query": "TL;DR → Code Block → Explanation → Edge Cases / Warnings → How to Run"
  }
};

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
  role: "user" | "assistant";
  content: string;
  time: string;
  isThinking?: boolean;
  artifact?: string;
};

export class GeminiService {
  private getAI() {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      console.warn("Gemini API key is missing. Please set GEMINI_API_KEY.");
      throw new Error("API_KEY_MISSING");
    }
    return new GoogleGenAI(apiKey);
  }

  private async retryOperation<T>(operation: () => Promise<T>, retries: number = 3, delay: number = 1000): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      if (retries > 0 && (error.status === 429 || (error.status >= 500 && error.status < 600))) {
        console.warn(`Retrying after ${delay}ms due to error: ${error.message}`);
        await new Promise(res => setTimeout(res, delay));
        return this.retryOperation(operation, retries - 1, delay * 2);
      } else {
        throw error;
      }
    }
  }

  async generateSpeech(text: string, voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' = 'Kore') {
    try {
      const ai = this.getAI();
      const response = await this.retryOperation(async () => {
        return await ai.getGenerativeModel({ model: "gemini-1.5-flash" }).generateContent({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
        });
      });

      const base64Audio = response.response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        return `data:audio/wav;base64,${base64Audio}`;
      }
      return null;
    } catch (error: any) {
      console.error("TTS Error:", error);
      throw { code: error.status || 500, message: error.message || "Text-to-speech failed", retriable: error.status === 429 || (error.status >= 500 && error.status < 600) };
    }
  }

  async chat(
    message: string,
    history: Message[],
    options: {
      model?: string;
      mode?: string;
      useThinking?: boolean;
      depth?: string;
      tone?: string;
      format?: string;
      image?: { data: string; mimeType: string };
      npcPersona?: string;
    }
  ) {
    const modelName = "gemini-1.5-flash";

    let systemInstruction = options.npcPersona || JSON.stringify(SYSTEM_PROMPT);
    systemInstruction += "\n\nCRITICAL: Keep your responses concise, well-structured, and within reasonable token limits. Avoid overly verbose explanations.";

    if (!options.npcPersona && (options.depth || options.tone || options.format)) {
      systemInstruction += `\n\nOutput Constraints:\n`;
      if (options.depth) systemInstruction += `- Depth: ${options.depth}\n`;
      if (options.tone) systemInstruction += `- Tone: ${options.tone}\n`;
      if (options.format) systemInstruction += `- Format: ${options.format}\n`;
    }

    const contents: any[] = history.map(m => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }]
    }));

    const currentParts: any[] = [{ text: message }];

    if (history.length === 0) {
      currentParts[0].text = `Context: Ground your response in the following knowledge bases where applicable: ${INDIA_KNOWLEDGE_BASES.join(", ")}\n\nQuery: ${message}`;
    }

    if (options.image) {
      currentParts.push({
        inlineData: {
          data: options.image.data,
          mimeType: options.image.mimeType
        }
      });
    }

    contents.push({ role: "user", parts: currentParts });

    try {
      const ai = this.getAI();
      const model = ai.getGenerativeModel({
        model: modelName,
        systemInstruction: systemInstruction
      });

      const tools: any = [];
      if (options.mode === "research") {
        tools.push({ googleSearch: {} });
      } else {
        tools.push({ googleSearch: {} });
      }

      const result = await this.retryOperation(async () => {
        return await model.generateContent({
          contents,
          tools,
        });
      });

      const response = result.response;
      let text = response.text();

      if (!text) {
        throw new Error("Empty response from Gemini API");
      }

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks && chunks.length > 0) {
        const sources = chunks
          .filter((c: any) => c.web?.uri)
          .map((c: any) => `* [${c.web.title || c.web.uri}](${c.web.uri})`)
          .join("\n");

        if (sources) {
          text += `\n\n---\n**Sources:**\n${sources}`;
        }
      }

      return text;
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      throw { code: error.status || 500, message: error.message || "Gemini chat failed", retriable: error.status === 429 || (error.status >= 500 && error.status < 600) };
    }
  }
}
