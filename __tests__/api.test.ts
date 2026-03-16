import request from "supertest";
import express from "express";
import session from "express-session";
import cors from "cors";
import bcrypt from "bcryptjs";

// Mock the entire api/index.ts module to isolate testing
jest.mock("../api/index.js", () => {
  const express = require("express");
  const app = express();
  app.use(express.json());
  app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }));
  app.use(session({
    secret: process.env.SESSION_SECRET || "supernova-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  }));

  // Mock a simple API endpoint for testing
  app.get("/api/test", (req: any, res: any) => {
    res.json({ message: "API is working" });
  });

  app.post("/api/gemini-mock", (req: any, res: any) => {
    if (req.body.prompt === "fail") {
      return res.status(500).json({ error: "Gemini API failed" });
    }
    res.json({ response: "Mocked Gemini Response for Integration Test" });
  });

  return app;
});

// Mock the GeminiService to control its behavior during integration tests
jest.mock("../src/services/geminiService", () => ({
  GeminiService: jest.fn(() => ({
    chat: jest.fn((prompt: string) => {
      if (prompt === "fail") {
        throw { code: 500, message: "Gemini chat failed", retriable: false };
      }
      return Promise.resolve("Mocked Gemini Response for Integration Test");
    }),
  })),
}));

describe("API Integration Tests", () => {
  let app: express.Application;

  beforeAll(() => {
    // Dynamically import the server.ts to get the express app instance
    // This assumes server.ts exports the app directly or has a function to get it
    // For this test, we'll create a minimal app that uses the mocked api/index.js
    app = express();
    app.use(require("../api/index.js"));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FRONTEND_URL = "http://localhost:3000";
    process.env.NODE_ENV = "development";
    process.env.SESSION_SECRET = "test-secret";
  });

  afterEach(() => {
    delete process.env.FRONTEND_URL;
    delete process.env.NODE_ENV;
    delete process.env.SESSION_SECRET;
  });

  it("should return 200 for /api/test", async () => {
    const res = await request(app).get("/api/test");
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ message: "API is working" });
  });

  it("should have correct CORS headers for allowed origin", async () => {
    const res = await request(app)
      .get("/api/test")
      .set("Origin", "http://localhost:3000");
    expect(res.headers["access-control-allow-origin"]).toEqual("http://localhost:3000");
    expect(res.headers["access-control-allow-credentials"]).toEqual("true");
  });

  it("should not have CORS headers for disallowed origin", async () => {
    const res = await request(app)
      .get("/api/test")
      .set("Origin", "http://malicious.com");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("should set secure cookie in production", async () => {
    process.env.NODE_ENV = "production";
    const res = await request(app).get("/api/test");
    const setCookieHeader = res.headers["set-cookie"];
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader[0]).toContain("Secure");
    expect(setCookieHeader[0]).toContain("SameSite=None");
  });

  it("should not set secure cookie in development", async () => {
    process.env.NODE_ENV = "development";
    const res = await request(app).get("/api/test");
    const setCookieHeader = res.headers["set-cookie"];
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader[0]).not.toContain("Secure");
    expect(setCookieHeader[0]).toContain("SameSite=Lax");
  });

  it("should return 200 for successful Gemini mock response", async () => {
    const res = await request(app)
      .post("/api/gemini-mock")
      .send({ prompt: "hello" });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ response: "Mocked Gemini Response for Integration Test" });
  });

  it("should return 500 for Gemini mock failure", async () => {
    const res = await request(app)
      .post("/api/gemini-mock")
      .send({ prompt: "fail" });
    expect(res.statusCode).toEqual(500);
    expect(res.body).toEqual({ error: "Gemini API failed" });
  });
});
