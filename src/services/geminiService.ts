import { GoogleGenAI, Modality } from "@google/genai";

// System Prompt-কে string-এ রূপান্তর করার জন্য একটি helper function
const formatSystemPrompt = (promptObj: any): string => {
  return `
    Role: ${promptObj.persona.role}
    Identity: ${promptObj.persona.name} (v${promptObj.prompt_version || '2.1.0'})
    Tone: ${promptObj.persona.tone}
    Mission: ${promptObj.persona.mission}
    
    India Intelligence Specializations:
    ${promptObj.india_intelligence.specializations.map((s: string) => `- ${s}`).join("\n")}
    
    Communication Rules:
    ${promptObj.communication_rules.map((r: string) => `- ${r}`).join("\n")}
  `;
};

const SYSTEM_PROMPT_CONFIG = {
  name: "SuperNova AI",
  version: "2.1.0",
  persona: {
    identity: "SuperNova",
    role: "The Ultimate Intelligence Orchestrator — a world-class AI assistant engineered for precision, depth, and actionable insight, with a deep specialization in the Indian subcontinent.",
    tone: "Professional yet warm. Analytical yet accessible. Think of a senior engineer and a trusted mentor combined.",
    mission: "To empower human potential by delivering the most accurate, structured, and insight-rich responses possible, grounded in both global and India-specific knowledge."
  },
  india_intelligence: {
    enabled: true,
    specializations: [
      "Education: Deep knowledge of CBSE, ICSE, State Boards, JEE, NEET, UPSC, GATE, and CAT preparation.",
      "Law & Governance: Understanding of the Constitution of India, IPC, CrPC, and recent legislative changes like BNS, BNSS, BSA.",
      "Economy & Business: Insights into the Indian startup ecosystem, GST, Digital India, UPI, and sector-specific policies (PLI schemes, etc.).",
      "Culture & Language: Native-level understanding of Indian culture, traditions, and major languages (Hindi, Bengali, Tamil, etc.).",
      "Geography & Infrastructure: Real-time awareness of Indian geography, cities, and major infrastructure projects (Gati Shakti, Smart Cities)."
    ]
  },
  communication_rules: [
    "ALWAYS respond in the same language the user writes in.",
    "Use clean Markdown formatting.",
    "NEVER use generic AI-speak phrases like 'As an AI...'.",
    "Be direct. Lead with the answer, then provide context.",
    "Always cite sources when providing statistics, especially from Indian government portals.",
    "Include a TL;DR summary at the TOP for long responses."
  ]
};

const INDIA_KNOWLEDGE_BASES = [
  "https://www.india.gov.in",
  "https://pib.gov.in",
  "https://www.rbi.org.in",
  "https://www.isro.gov.in",
  "https://www.ncert.nic.in",
  "https://www.nta.ac.in",
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
  private genAI: GoogleGenAI;

  constructor() {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      console.error("CRITICAL: Gemini API key is missing.");
    }
    this.genAI = new GoogleGenAI(apiKey);
  }

  /**
   * Generates Speech using Gemini Multimodal capabilities
   */
  async generateSpeech(text: string, voiceName: string = 'Kore') {
    try {
      // দ্রষ্টব্য: gemini-1.5-flash সরাসরি অডিও আউটপুট দিতে পারে যদি modality সেট করা থাকে
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text }] }],
        generationConfig: {
          responseMimeType: "audio/wav", // নির্দিষ্ট মিডিয়া টাইপ
        },
      });

      const response = await result.response;
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      return base64Audio ? `data:audio/wav;base64,${base64Audio}` : null;
    } catch (error) {
      console.error("TTS Error:", error);
      throw error;
    }
  }

  async chat(
    message: string,
    history: Message[],
    options: {
      mode?: "research" | "chat";
      image?: { data: string; mimeType: string };
      depth?: string;
    }
  ) {
    // ১. মডেল সিলেকশন (Free Tier এর জন্য gemini-1.5-flash সবচেয়ে ভালো)
    const modelName = "gemini-1.5-flash";
    
    // ২. সিস্টেম ইন্সট্রাকশন তৈরি
    let systemText = formatSystemPrompt(SYSTEM_PROMPT_CONFIG);
    systemText += `\n\nCRITICAL: Keep responses concise. Depth requested: ${options.depth || 'standard'}.`;

    // ৩. টুলস কনফিগারেশন
    const tools: any[] = [];
    if (options.mode === "research") {
      tools.push({ googleSearchRetrieval: {} }); // প্রফেশনাল সার্চ টুল
    }

    const model = this.genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemText,
      tools: tools,
    });

    // ৪. চ্যাট হিস্ট্রি প্রসেসিং
    const chatSession = model.startChat({
      history: history.map(m => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
      }
    });

    // ৫. বর্তমান মেসেজ ও ইমেজ হ্যান্ডলিং
    const currentParts: any[] = [];
    
    // প্রথম মেসেজে নলেজ বেস যুক্ত করা
    if (history.length === 0) {
      currentParts.push({ 
        text: `Context: Ground your knowledge in these bases: ${INDIA_KNOWLEDGE_BASES.join(", ")}\n\nQuery: ${message}` 
      });
    } else {
      currentParts.push({ text: message });
    }

    if (options.image) {
      currentParts.push({
        inlineData: {
          data: options.image.data,
          mimeType: options.image.mimeType
        }
      });
    }

    try {
      const result = await chatSession.sendMessage(currentParts);
      const response = await result.response;
      let text = response.text();

      // গ্রাউন্ডিং সোর্স (যদি থাকে) যুক্ত করা
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
      if (groundingMetadata?.searchEntryPoint?.htmlContent) {
        // আপনি চাইলে এখানে সোর্স লিঙ্কগুলো আলাদাভাবে ফরম্যাট করতে পারেন
        text += `\n\n*Verified via Google Search*`;
      }

      return text;
    } catch (error) {
      console.error("Gemini API Error:", error);
      return "দুঃখিত, আমি এই মুহূর্তে রেসপন্স তৈরি করতে পারছি না। দয়া করে আবার চেষ্টা করুন।";
    }
  }
}
