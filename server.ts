import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import session from "express-session";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv"; // .env লোড করার জন্য
import { GoogleGenAI } from "@google/genai"; // এআই এর জন্য

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("supernova.db");

// --- আপনার ডাটাবেস টেবিল তৈরির কোড (আগের মতোই থাকবে) ---
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    is_verified INTEGER DEFAULT 0,
    verification_token TEXT
  );
  CREATE TABLE IF NOT EXISTS preferences (
    user_id INTEGER PRIMARY KEY,
    theme TEXT DEFAULT 'classic',
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER,
    role TEXT,
    content TEXT,
    time TEXT,
    FOREIGN KEY(chat_id) REFERENCES chat_history(id)
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    description TEXT,
    status TEXT DEFAULT 'todo',
    priority TEXT DEFAULT 'medium',
    due_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// --- জেমিনি এআই ইনিশিয়ালাইজেশন ---
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY || "");

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());
  app.use(session({
    secret: "supernova-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: false, 
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7 
    }
  }));

  // --- ১. আপনার নতুন AI API Route (এটি যোগ করা হয়েছে) ---
  app.post("/api/generate", async (req, res) => {
    try {
      const { prompt } = req.body;
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      res.json({ success: true, text: response.text() });
    } catch (error) {
      console.error('AI Error:', error);
      res.status(500).json({ error: "এআই রেসপন্স দিতে সমস্যা হচ্ছে।" });
    }
  });

  // --- ২. আপনার আগের সব Auth Routes (signup, login, etc.) ---
  // (আমি এখানে জায়গা বাঁচাতে কোডগুলো ছোট করে দেখাচ্ছি, কিন্তু আপনার অরিজিনাল কোডটিই থাকবে)
  app.post("/api/auth/signup", async (req, res) => { /* আপনার কোড */ });
  app.post("/api/auth/login", async (req, res) => { /* আপনার কোড */ });
  app.get("/api/auth/me", (req, res) => { /* আপনার কোড */ });
  app.post("/api/auth/logout", (req, res) => { /* আপনার কোড */ });

  // --- ৩. আপনার চ্যাট, টাস্ক এবং প্রেফারেন্স রাউটস ---
  // (এগুলো আপনার আগের কোড অনুযায়ী কাজ করবে)
  app.get("/api/chats", (req, res) => { /* আপনার কোড */ });
  app.get("/api/tasks", (req, res) => { /* আপনার কোড */ });

  // --- ৪. Vite এবং স্ট্যাটিক ফাইল হ্যান্ডলিং (Render/Vercel এর জন্য) ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ SuperNova Server running on http://localhost:${PORT}`);
  });
}

startServer();

