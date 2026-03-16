import { GeminiService } from "../src/services/geminiService";

// Mock the @google/genai module
jest.mock("@google/genai", () => ({
  GoogleGenAI: jest.fn(() => ({
    getGenerativeModel: jest.fn(() => ({
      generateContent: jest.fn((args) => {
        if (args.contents[0].parts[0].text.includes("error")) {
          throw { status: 500, message: "Internal Server Error from Gemini" };
        }
        if (args.contents[0].parts[0].text.includes("quota")) {
          throw { status: 429, message: "QUOTA_EXHAUSTED" };
        }
        return Promise.resolve({
          response: {
            text: () => "Mocked Gemini Response",
            candidates: [
              {
                groundingMetadata: {
                  groundingChunks: [
                    { web: { title: "Google", uri: "https://google.com" } },
                  ],
                },
              },
            ],
          },
        });
      }),
    })),
  })),
  Modality: {
    AUDIO: "audio",
  },
}));

describe("GeminiService", () => {
  let geminiService: GeminiService;

  beforeEach(() => {
    geminiService = new GeminiService();
    process.env.GEMINI_API_KEY = "test-api-key";
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.GEMINI_API_KEY;
  });

  it("should throw API_KEY_MISSING error if GEMINI_API_KEY is not set", async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(geminiService.chat("test", [], {})).rejects.toEqual({
      code: "API_KEY_MISSING",
      message: "API_KEY_MISSING",
      retriable: false,
    });
  });

  it("should return a mocked response for a happy path chat", async () => {
    const response = await geminiService.chat("hello", [], {});
    expect(response).toContain("Mocked Gemini Response");
    expect(response).toContain("https://google.com");
  });

  it("should handle Gemini API 500 errors", async () => {
    await expect(geminiService.chat("trigger error", [], {})).rejects.toEqual({
      code: 500,
      message: "Internal Server Error from Gemini",
      retriable: true,
    });
  });

  it("should handle Gemini API 429 (quota) errors with retry", async () => {
    const { GoogleGenAI } = require("@google/genai");
    const mockGenerateContent = GoogleGenAI().getGenerativeModel().generateContent;

    // Simulate 2 retriable errors then success
    mockGenerateContent.mockImplementationOnce(() => {
      throw { status: 429, message: "QUOTA_EXHAUSTED" };
    });
    mockGenerateContent.mockImplementationOnce(() => {
      throw { status: 429, message: "QUOTA_EXHAUSTED" };
    });
    mockGenerateContent.mockImplementationOnce(() => {
      return Promise.resolve({
        response: {
          text: () => "Mocked Gemini Response after retry",
          candidates: [],
        },
      });
    });

    const response = await geminiService.chat("trigger quota", [], {});
    expect(response).toContain("Mocked Gemini Response after retry");
    expect(mockGenerateContent).toHaveBeenCalledTimes(3);
  });

  it("should handle empty response from Gemini API", async () => {
    const { GoogleGenAI } = require("@google/genai");
    const mockGenerateContent = GoogleGenAI().getGenerativeModel().generateContent;
    mockGenerateContent.mockImplementationOnce(() => {
      return Promise.resolve({
        response: {
          text: () => "", // Empty response
          candidates: [],
        },
      });
    });

    await expect(geminiService.chat("empty response", [], {})).rejects.toEqual({
      code: 500,
      message: "Empty response from Gemini API",
      retriable: false,
    });
  });

  it("should generate speech successfully", async () => {
    const audioUrl = await geminiService.generateSpeech("Hello world");
    expect(audioUrl).toContain("data:audio/wav;base64,");
  });

  it("should handle speech generation errors", async () => {
    const { GoogleGenAI } = require("@google/genai");
    const mockGenerateContent = GoogleGenAI().getGenerativeModel().generateContent;
    mockGenerateContent.mockImplementationOnce(() => {
      throw { status: 500, message: "TTS failed" };
    });

    await expect(geminiService.generateSpeech("trigger speech error")).rejects.toEqual({
      code: 500,
      message: "TTS failed",
      retriable: true,
    });
  });
});
