import express from "express";
import session from "express-session";
import bcrypt from "bcryptjs";

const app = express();
app.set("trust proxy", 1);

// In-memory data stores (replacing database)
let users: any[] = [];
let preferences: any[] = [];
let chat_history: any[] = [];
let messages: any[] = [];
let tasks: any[] = [];

let nextUserId = 1;
let nextChatId = 1;
let nextMessageId = 1;
let nextTaskId = 1;

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || "supernova-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: true,
    sameSite: 'none',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
  }
}));

// Auth Routes
app.post("/api/auth/signup", async (req, res) => {
  const { email, password, name } = req.body;
  try {
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = Math.random().toString(36).substring(2, 15);
    
    const user = {
      id: nextUserId++,
      email,
      password: hashedPassword,
      name,
      is_verified: 0,
      verification_token: verificationToken
    };
    users.push(user);
    
    preferences.push({ user_id: user.id, theme: 'classic' });
    
    console.log(`[VERIFICATION EMAIL] To: ${email}, Link: ${process.env.APP_URL || 'http://localhost:3000'}/verify?token=${verificationToken}`);
    
    res.json({ success: true, message: "Please check your email to verify your account." });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: "Signup failed" });
  }
});

app.post("/api/auth/verify", (req, res) => {
  const { token } = req.body;
  const user = users.find(u => u.verification_token === token);
  
  if (user) {
    user.is_verified = 1;
    user.verification_token = null;
    // @ts-ignore
    req.session.userId = user.id;
    res.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
  } else {
    res.status(400).json({ error: "Invalid or expired verification token" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  
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
    const user = users.find(u => u.id === req.session.userId);
    if (user) {
      res.json({ id: user.id, email: user.email, name: user.name });
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
});

app.patch("/api/auth/me", async (req, res) => {
  // @ts-ignore
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  const { name, email, password } = req.body;
  
  // @ts-ignore
  const user = users.find(u => u.id === req.session.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  try {
    if (email && email !== user.email && users.find(u => u.email === email)) {
       return res.status(400).json({ error: "Email already in use" });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: "Update failed" });
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
  const chats = chat_history.filter(c => c.user_id === req.session.userId).sort((a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime());
  res.json(chats);
});

app.post("/api/chats", (req, res) => {
  // @ts-ignore
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  const { title } = req.body;
  
  const chat = {
    id: nextChatId++,
    // @ts-ignore
    user_id: req.session.userId,
    title: title || "New Conversation",
    last_updated: new Date().toISOString()
  };
  chat_history.push(chat);
  
  res.json({ id: chat.id, title: chat.title });
});

app.patch("/api/chats/:id", (req, res) => {
  // @ts-ignore
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  const { title } = req.body;
  const id = parseInt(req.params.id);
  
  // @ts-ignore
  const chat = chat_history.find(c => c.id === id && c.user_id === req.session.userId);
  if (chat) {
    chat.title = title;
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Chat not found" });
  }
});

app.delete("/api/chats/:id", (req, res) => {
  // @ts-ignore
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  const id = parseInt(req.params.id);
  
  // @ts-ignore
  const chatIndex = chat_history.findIndex(c => c.id === id && c.user_id === req.session.userId);
  if (chatIndex !== -1) {
    chat_history.splice(chatIndex, 1);
    messages = messages.filter(m => m.chat_id !== id);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Chat not found" });
  }
});

app.get("/api/chats/:id/messages", (req, res) => {
  // @ts-ignore
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  const id = parseInt(req.params.id);
  
  // @ts-ignore
  const chat = chat_history.find(c => c.id === id && c.user_id === req.session.userId);
  if (!chat) return res.status(404).json({ error: "Chat not found" });

  const chatMessages = messages.filter(m => m.chat_id === id).sort((a, b) => a.id - b.id);
  res.json(chatMessages.map(m => ({ role: m.role, content: m.content, time: m.time })));
});

app.post("/api/chats/:id/messages", (req, res) => {
  // @ts-ignore
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  const id = parseInt(req.params.id);
  const { role, content, time } = req.body;
  
  // @ts-ignore
  const chat = chat_history.find(c => c.id === id && c.user_id === req.session.userId);
  if (!chat) return res.status(404).json({ error: "Chat not found" });

  messages.push({
    id: nextMessageId++,
    chat_id: id,
    role,
    content,
    time
  });
  chat.last_updated = new Date().toISOString();
  
  res.json({ success: true });
});

// Preferences Routes
app.get("/api/preferences", (req, res) => {
  // @ts-ignore
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  // @ts-ignore
  const prefs = preferences.find(p => p.user_id === req.session.userId);
  res.json(prefs || { theme: 'classic' });
});

app.post("/api/preferences", (req, res) => {
  // @ts-ignore
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  const { theme } = req.body;
  // @ts-ignore
  let prefs = preferences.find(p => p.user_id === req.session.userId);
  if (prefs) {
    prefs.theme = theme;
  } else {
    // @ts-ignore
    preferences.push({ user_id: req.session.userId, theme });
  }
  res.json({ success: true });
});

// Task Routes
app.get("/api/tasks", (req, res) => {
  // @ts-ignore
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  // @ts-ignore
  const userTasks = tasks.filter(t => t.user_id === req.session.userId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json(userTasks);
});

app.post("/api/tasks", (req, res) => {
  // @ts-ignore
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  const { title, description, priority, due_date } = req.body;
  
  const task = {
    id: nextTaskId++,
    // @ts-ignore
    user_id: req.session.userId,
    title,
    description,
    status: 'todo',
    priority: priority || 'medium',
    due_date,
    created_at: new Date().toISOString()
  };
  tasks.push(task);
  
  res.json(task);
});

app.patch("/api/tasks/:id", (req, res) => {
  // @ts-ignore
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  const { title, description, status, priority, due_date } = req.body;
  const id = parseInt(req.params.id);
  
  // @ts-ignore
  const task = tasks.find(t => t.id === id && t.user_id === req.session.userId);
  if (task) {
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (due_date !== undefined) task.due_date = due_date;
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Task not found" });
  }
});

app.delete("/api/tasks/:id", (req, res) => {
  // @ts-ignore
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  const id = parseInt(req.params.id);
  
  // @ts-ignore
  const taskIndex = tasks.findIndex(t => t.id === id && t.user_id === req.session.userId);
  if (taskIndex !== -1) {
    tasks.splice(taskIndex, 1);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Task not found" });
  }
});

export default app;
