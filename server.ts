import express from "express";
import Database from "better-sqlite3";
import session from "express-session";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Vercel-এ শুধুমাত্র /tmp ডিরেক্টরিতে ফাইল রাইট করা যায়। 
// (সতর্কতা: Vercel-এ এই ডাটাবেসটি স্থায়ী হবে না, রিস্টার্ট হলে মুছে যাবে)
const dbPath = process.env.NODE_ENV === "production" ? "/tmp/supernova.db" : "supernova.db";
const db = new Database(dbPath);

// --- ডাটাবেস টেবিল তৈরি ---
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
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const app = express();

app.use(express.json());
app.use(session({
  secret: "supernova-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === "production", // Vercel-এ true হবে
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7 
  }
}));

// --- ১. AI API Route ---
app.post("/api/generate", async (req, res) => {
  try {
    const { prompt } = req.body;
    
    const response = await genAI.models.generateContent({
      model: "gemini-1.5-flash-8b",
      contents: prompt
    });
    
    res.json({ success: true, text: response.text });
    
  } catch (error) {
    console.error('AI Error:', error);
    res.status(500).json({ error: "এআই রেসপন্স দিতে সমস্যা হচ্ছে।" });
  }
});

// --- ২. Auth Routes (আপনার আগের কোড এখানে বসাবেন) ---
app.post("/api/auth/signup", async (req, res) => { /* আপনার কোড */ });
app.post("/api/auth/login", async (req, res) => { /* আপনার কোড */ });
app.get("/api/auth/me", (req, res) => { /* আপনার কোড */ });
app.post("/api/auth/logout", (req, res) => { /* আপনার কোড */ });

// --- ৩. চ্যাট, টাস্ক এবং প্রেফারেন্স রাউটস (আপনার আগের কোড এখানে বসাবেন) ---
app.get("/api/chats", (req, res) => { /* আপনার কোড */ });
app.get("/api/tasks", (req, res) => { /* আপনার কোড */ });


// --- ৪. Vercel Serverless Export ---
// Vercel-এ Vite middleware বা app.listen() কাজ করে না, তাই সেগুলো বাদ দেওয়া হয়েছে।
// Vercel নিজে থেকেই ফ্রন্টএন্ড (dist) সার্ভ করবে।

if (process.env.NODE_ENV !== "production") {
  // শুধুমাত্র আপনার লোকাল কম্পিউটারে রান করার জন্য
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ SuperNova Server running on http://localhost:${PORT}`);
  });
}

// Vercel-এর জন্য Express App-টিকে Export করতে হবে
export default app;
