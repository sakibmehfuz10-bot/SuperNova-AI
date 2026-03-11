import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import session from "express-session";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("supernova.db");

// Initialize Database
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(session({
    secret: "supernova-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: false, // Set to true if using HTTPS
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
    }
  }));

  // Auth Routes
  app.post("/api/auth/signup", async (req, res) => {
    const { email, password, name } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const verificationToken = Math.random().toString(36).substring(2, 15);
      
      const result = db.prepare("INSERT INTO users (email, password, name, verification_token) VALUES (?, ?, ?, ?)").run(email, hashedPassword, name, verificationToken);
      const userId = result.lastInsertRowid;
      db.prepare("INSERT INTO preferences (user_id) VALUES (?)").run(userId);
      
      // In a real app, you would send an email here.
      console.log(`[VERIFICATION EMAIL] To: ${email}, Link: ${process.env.APP_URL}/verify?token=${verificationToken}`);
      
      res.json({ success: true, message: "Please check your email to verify your account." });
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/auth/verify", (req, res) => {
    const { token } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE verification_token = ?").get(token) as any;
    
    if (user) {
      db.prepare("UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?").run(user.id);
      // @ts-ignore
      req.session.userId = user.id;
      res.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
    } else {
      res.status(400).json({ error: "Invalid or expired verification token" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    
    if (user && await bcrypt.compare(password, user.password)) {
      if (user.is_verified === 0) {
        return res.status(403).json({ error: "Please verify your email address before logging in.", unverified: true });
      }
      // @ts-ignore
      req.session.userId = user.id;
      res.json({ id: user.id, email: user.email, name: user.name });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.get("/api/auth/me", (req, res) => {
    // @ts-ignore
    if (req.session.userId) {
      // @ts-ignore
      const user = db.prepare("SELECT id, email, name FROM users WHERE id = ?").get(req.session.userId);
      res.json(user);
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  app.patch("/api/auth/me", async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    const { name, email, password } = req.body;
    
    try {
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        // @ts-ignore
        db.prepare("UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?").run(name, email, hashedPassword, req.session.userId);
      } else {
        // @ts-ignore
        db.prepare("UPDATE users SET name = ?, email = ? WHERE id = ?").run(name, email, req.session.userId);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Email already in use" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  // Chat Routes
  app.get("/api/chats", (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    // @ts-ignore
    const chats = db.prepare("SELECT * FROM chat_history WHERE user_id = ? ORDER BY last_updated DESC").all(req.session.userId);
    res.json(chats);
  });

  app.post("/api/chats", (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    const { title } = req.body;
    // @ts-ignore
    const result = db.prepare("INSERT INTO chat_history (user_id, title) VALUES (?, ?)").run(req.session.userId, title || "New Conversation");
    res.json({ id: result.lastInsertRowid, title: title || "New Conversation" });
  });

  app.patch("/api/chats/:id", (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    const { title } = req.body;
    const { id } = req.params;
    // @ts-ignore
    const result = db.prepare("UPDATE chat_history SET title = ? WHERE id = ? AND user_id = ?").run(title, id, req.session.userId);
    if (result.changes > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Chat not found" });
    }
  });

  app.delete("/api/chats/:id", (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    const { id } = req.params;
    // @ts-ignore
    db.prepare("DELETE FROM messages WHERE chat_id = ?").run(id);
    // @ts-ignore
    const result = db.prepare("DELETE FROM chat_history WHERE id = ? AND user_id = ?").run(id, req.session.userId);
    if (result.changes > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Chat not found" });
    }
  });

  app.get("/api/chats/:id/messages", (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    const { id } = req.params;
    // Verify ownership
    // @ts-ignore
    const chat = db.prepare("SELECT id FROM chat_history WHERE id = ? AND user_id = ?").get(id, req.session.userId);
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    const messages = db.prepare("SELECT role, content, time FROM messages WHERE chat_id = ? ORDER BY id ASC").all(id);
    res.json(messages);
  });

  app.post("/api/chats/:id/messages", (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    const { id } = req.params;
    const { role, content, time } = req.body;
    // Verify ownership
    // @ts-ignore
    const chat = db.prepare("SELECT id FROM chat_history WHERE id = ? AND user_id = ?").get(id, req.session.userId);
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    db.prepare("INSERT INTO messages (chat_id, role, content, time) VALUES (?, ?, ?, ?)").run(id, role, content, time);
    db.prepare("UPDATE chat_history SET last_updated = CURRENT_TIMESTAMP WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Preferences Routes
  app.get("/api/preferences", (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    // @ts-ignore
    const prefs = db.prepare("SELECT * FROM preferences WHERE user_id = ?").get(req.session.userId);
    res.json(prefs);
  });

  app.post("/api/preferences", (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    const { theme } = req.body;
    // @ts-ignore
    db.prepare("UPDATE preferences SET theme = ? WHERE user_id = ?").run(theme, req.session.userId);
    res.json({ success: true });
  });

  // Task Routes
  app.get("/api/tasks", (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    // @ts-ignore
    const tasks = db.prepare("SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC").all(req.session.userId);
    res.json(tasks);
  });

  app.post("/api/tasks", (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    const { title, description, priority, due_date } = req.body;
    // @ts-ignore
    const result = db.prepare("INSERT INTO tasks (user_id, title, description, priority, due_date) VALUES (?, ?, ?, ?, ?)").run(req.session.userId, title, description, priority || 'medium', due_date);
    res.json({ id: result.lastInsertRowid, title, description, priority: priority || 'medium', due_date, status: 'todo' });
  });

  app.patch("/api/tasks/:id", (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    const { title, description, status, priority, due_date } = req.body;
    const { id } = req.params;
    // @ts-ignore
    const result = db.prepare("UPDATE tasks SET title = COALESCE(?, title), description = COALESCE(?, description), status = COALESCE(?, status), priority = COALESCE(?, priority), due_date = COALESCE(?, due_date) WHERE id = ? AND user_id = ?").run(title, description, status, priority, due_date, id, req.session.userId);
    if (result.changes > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Task not found" });
    }
  });

  app.delete("/api/tasks/:id", (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    const { id } = req.params;
    // @ts-ignore
    const result = db.prepare("DELETE FROM tasks WHERE id = ? AND user_id = ?").run(id, req.session.userId);
    if (result.changes > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Task not found" });
    }
  });

  // Vite middleware for development
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
