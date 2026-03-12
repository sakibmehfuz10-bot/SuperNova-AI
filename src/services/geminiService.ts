import { GoogleGenAI, ThinkingLevel, Modality } from "@google/genai";

const SYSTEM_PROMPT = `
{
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
    "NEVER use generic AI-speak phrases like 'As an AI...'.",
    "Be direct. Lead with the answer, then provide context.",
    "Always cite sources when providing statistics, especially from Indian government portals.",
    "Include a TL;DR summary at the TOP for long responses."
  ],
  "response_format": {
    "standard_query": "TL;DR → Main Answer → Supporting Details → Next Steps",
    "technical_query": "TL;DR → Code Block → Explanation → Edge Cases / Warnings → How to Run"
  }
}
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
  role: "user" | "assistant";
  content: string;
  time: string;
  isThinking?: boolean;
  artifact?: string;
};

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      console.warn("Gemini API key is missing. Please set VITE_GEMINI_API_KEY or GEMINI_API_KEY.");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateSpeech(text: string, voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' = 'Kore') {
    try {
      const response = await this.ai.models.generateContent({
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

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        return `data:audio/wav;base64,${base64Audio}`;
      }
      return null;
    } catch (error) {
      console.error("TTS Error:", error);
      throw error;
    }
  }

  async chat(
    message: string, 
    history: Message[], 
    options: { 
      model: string; 
      mode?: string;
      useThinking?: boolean;
      depth?: string;
      tone?: string;
      format?: string;
      image?: { data: string; mimeType: string };
      npcPersona?: string;
    }
  ) {
    let modelName = options.model;
    
    let systemInstruction = options.npcPersona || SYSTEM_PROMPT;
    if (!options.npcPersona && (options.depth || options.tone || options.format)) {
      systemInstruction += `\n\nOutput Constraints:\n`;
      if (options.depth) systemInstruction += `- Depth: ${options.depth}\n`;
      if (options.tone) systemInstruction += `- Tone: ${options.tone}\n`;
      if (options.format) systemInstruction += `- Format: ${options.format}\n`;
    }

    const config: any = {
      systemInstruction: systemInstruction,
      tools: []
    };

    if (options.mode === "research") {
      modelName = "gemini-3-flash-preview";
      config.tools.push({ googleSearch: {} });
    } else {
      config.tools.push({ googleSearch: {} }, { urlContext: {} });
    }

    if (options.useThinking && modelName.includes("pro")) {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
    }

    const contents: any[] = history.map(m => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }]
    }));

    // Add India knowledge bases to the first message part if history is empty, 
    // or just include them in the prompt context.
    const currentParts: any[] = [{ text: message }];
    
    // We add the URLs to the prompt to trigger urlContext
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
      const response = await this.ai.models.generateContent({
        model: modelName,
        contents,
        config,
      });

      let text = response.text || "I'm sorry, I couldn't generate a response.";
      
      // Extract grounding sources if available
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
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  }
}
