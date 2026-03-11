/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, createContext, useContext } from "react";
import { 
  Send, 
  Plus, 
  Menu, 
  X, 
  MessageSquare, 
  User, 
  Sparkles, 
  Zap, 
  Brain, 
  Image as ImageIcon,
  ChevronRight,
  PanelRightClose,
  PanelRightOpen,
  History,
  LogOut,
  Settings,
  Search,
  MoreVertical,
  Palette,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Check,
  Loader2,
  ListTodo,
  Volume2,
  VolumeX,
  Info,
  SlidersHorizontal,
  Gamepad
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { GeminiService, Message } from "./services/geminiService";
import { ChatProvider, useChat, ChatHistoryItem, Model } from "./contexts/ChatContext";
import { TaskManagement } from "./components/TaskManagement";
import { AboutUs } from "./components/AboutUs";
import { NPCGame } from "./components/NPCGame";
import { ResearchMoodFutures } from "./components/ResearchMoodFutures";
import { LandingPage } from "./components/LandingPage";

// --- Auth Context ---
interface User {
  id: number;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<{ message: string }>;
  verify: (token: string) => Promise<void>;
  updateUser: (data: { name: string; email: string; password?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = () => {
    fetch("/api/auth/me")
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data.error || "Invalid credentials");
      (error as any).unverified = data.unverified;
      throw error;
    }
    setUser(data);
  };

  const signup = async (email: string, password: string, name: string) => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Signup failed");
    return data;
  };

  const verify = async (token: string) => {
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Verification failed");
    setUser(data.user);
  };

  const updateUser = async (data: { name: string; email: string; password?: string }) => {
    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || "Update failed");
    fetchMe();
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, verify, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

// --- Components ---

const AuthModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [view, setView] = useState<"login" | "signup" | "verify" | "success">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const { login, signup, verify } = useAuth();

  useEffect(() => {
    // Check for token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get("token");
    if (urlToken && isOpen) {
      setToken(urlToken);
      setView("verify");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (view === "login") {
        await login(email, password);
        onClose();
      } else if (view === "signup") {
        const data = await signup(email, password, name);
        setMessage(data.message);
        setView("success");
      } else if (view === "verify") {
        await verify(token);
        onClose();
      }
    } catch (err: any) {
      setError(err.message);
      if (err.unverified) {
        setView("verify");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[var(--surface-main)] p-8 rounded-3xl shadow-2xl w-full max-w-md border border-[var(--border-main)]"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-serif font-bold">
            {view === "login" ? "Welcome Back" : 
             view === "signup" ? "Join SuperNova" : 
             view === "verify" ? "Verify Email" : "Check Your Email"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--surface-hover)] rounded-full"><X className="w-5 h-5" /></button>
        </div>

        {view === "success" ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8" />
            </div>
            <p className="text-sm text-[var(--text-muted)]">{message}</p>
            <p className="text-xs text-[var(--text-muted)] italic">(For demo: Check the server console for the verification link)</p>
            <button 
              onClick={() => setView("verify")}
              className="w-full py-3 bg-[var(--accent-main)] text-white rounded-xl font-bold"
            >
              Enter Verification Token
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {view === "signup" && (
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-[var(--text-muted)]">Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-[var(--surface-hover)] border border-[var(--border-main)] rounded-xl outline-none focus:border-[var(--accent-main)]"
                    placeholder="Your Name"
                    required
                  />
                </div>
              </div>
            )}
            
            {view !== "verify" ? (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-[var(--text-muted)]">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input 
                      type="email" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-[var(--surface-hover)] border border-[var(--border-main)] rounded-xl outline-none focus:border-[var(--accent-main)]"
                      placeholder="email@example.com"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-[var(--text-muted)]">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input 
                      type="password" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-[var(--surface-hover)] border border-[var(--border-main)] rounded-xl outline-none focus:border-[var(--accent-main)]"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-[var(--text-muted)]">Verification Token</label>
                <div className="relative">
                  <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input 
                    type="text" 
                    value={token} 
                    onChange={e => setToken(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-[var(--surface-hover)] border border-[var(--border-main)] rounded-xl outline-none focus:border-[var(--accent-main)]"
                    placeholder="Enter token from email"
                    required
                  />
                </div>
              </div>
            )}

            {error && <p className="text-red-500 text-xs">{error}</p>}

            <button 
              type="submit"
              className="w-full py-3 bg-[var(--accent-main)] text-white rounded-xl font-bold shadow-lg hover:scale-[1.02] transition-transform"
            >
              {view === "login" ? "Log In" : view === "signup" ? "Sign Up" : "Verify"}
            </button>
          </form>
        )}

        {view !== "success" && (
          <p className="text-center mt-6 text-sm text-[var(--text-muted)]">
            {view === "login" ? "Don't have an account?" : 
             view === "signup" ? "Already have an account?" : "Need to login?"}{" "}
            <button 
              onClick={() => setView(view === "login" ? "signup" : "login")}
              className="text-[var(--accent-main)] font-bold hover:underline"
            >
              {view === "login" ? "Sign Up" : "Log In"}
            </button>
          </p>
        )}
      </motion.div>
    </div>
  );
};

// --- Profile Page ---

const ProfilePage: React.FC<{ onBack: () => void; onToggleSidebar: () => void }> = ({ onBack, onToggleSidebar }) => {
  const { user, updateUser } = useAuth();
  const { chatHistory, loadChat, setActiveChatId } = useChat();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (password && password !== confirmPassword) {
      setStatus({ type: "error", message: "Passwords do not match" });
      return;
    }

    try {
      await updateUser({ name, email, password: password || undefined });
      setStatus({ type: "success", message: "Profile updated successfully" });
      setIsEditing(false);
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setStatus({ type: "error", message: err.message });
    }
  };

  const onSelectChat = (id: number) => {
    loadChat(id);
    onBack();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 overflow-y-auto p-8 bg-[var(--bg-main)] relative"
    >
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={onToggleSidebar}
            className="p-2 hover:bg-[var(--border-main)] rounded-lg text-[var(--text-muted)] transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--accent-main)] transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back to Chat
          </button>
        </div>

        <div className="flex items-center gap-6 mb-12">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--accent-main)] to-[var(--accent-secondary)] flex items-center justify-center border-4 border-[var(--surface-main)] shadow-xl">
            <span className="text-3xl font-bold text-white uppercase">{user?.name[0]}</span>
          </div>
          <div>
            <h2 className="text-3xl font-serif font-bold mb-1">{user?.name}</h2>
            <p className="text-[var(--text-muted)] flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {user?.email}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-[var(--surface-main)] border border-[var(--border-main)] rounded-3xl p-8 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-serif font-bold">Account Information</h3>
                {!isEditing && (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 text-sm font-bold text-[var(--accent-main)] hover:underline"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Profile
                  </button>
                )}
              </div>

              <form onSubmit={handleUpdate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-[var(--text-muted)]">Full Name</label>
                    <input 
                      type="text" 
                      value={name} 
                      onChange={e => setName(e.target.value)}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 bg-[var(--surface-hover)] border border-[var(--border-main)] rounded-xl outline-none focus:border-[var(--accent-main)] disabled:opacity-60"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-[var(--text-muted)]">Email Address</label>
                    <input 
                      type="email" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 bg-[var(--surface-hover)] border border-[var(--border-main)] rounded-xl outline-none focus:border-[var(--accent-main)] disabled:opacity-60"
                    />
                  </div>
                </div>

                {isEditing && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="space-y-6 pt-6 border-t border-[var(--border-main)]"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-[var(--text-muted)]">New Password</label>
                        <input 
                          type="password" 
                          value={password} 
                          onChange={e => setPassword(e.target.value)}
                          placeholder="Leave blank to keep current"
                          className="w-full px-4 py-3 bg-[var(--surface-hover)] border border-[var(--border-main)] rounded-xl outline-none focus:border-[var(--accent-main)]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-[var(--text-muted)]">Confirm New Password</label>
                        <input 
                          type="password" 
                          value={confirmPassword} 
                          onChange={e => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-3 bg-[var(--surface-hover)] border border-[var(--border-main)] rounded-xl outline-none focus:border-[var(--accent-main)]"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {status && (
                  <p className={`text-sm font-medium ${status.type === "success" ? "text-green-600" : "text-red-500"}`}>
                    {status.message}
                  </p>
                )}

                {isEditing && (
                  <div className="flex gap-4 pt-4">
                    <button 
                      type="submit"
                      className="px-8 py-3 bg-[var(--accent-main)] text-white rounded-xl font-bold shadow-lg hover:scale-[1.02] transition-transform"
                    >
                      Save Changes
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setName(user?.name || "");
                        setEmail(user?.email || "");
                        setPassword("");
                        setConfirmPassword("");
                        setStatus(null);
                      }}
                      className="px-8 py-3 bg-[var(--surface-hover)] text-[var(--text-muted)] rounded-xl font-bold hover:bg-[var(--border-main)] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </form>
            </div>

            <div className="p-8 border border-[var(--border-main)] rounded-3xl bg-[var(--surface-main)] shadow-sm">
              <h3 className="text-xl font-serif font-bold mb-6">Preferences</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold mb-1">Visual Theme</p>
                    <p className="text-sm text-[var(--text-muted)]">Customize the appearance of SuperNova AI</p>
                  </div>
                  <div className="flex gap-2">
                    {THEMES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => document.documentElement.setAttribute("data-theme", t.id)}
                        className="w-8 h-8 rounded-full border-2 border-[var(--surface-main)] shadow-sm hover:scale-110 transition-transform"
                        style={{ backgroundColor: t.color }}
                        title={t.name}
                      />
                    ))}
                  </div>
                </div>
                <div className="pt-6 border-t border-[var(--border-main)] flex items-center justify-between">
                  <div>
                    <p className="font-bold mb-1">Email Notifications</p>
                    <p className="text-sm text-[var(--text-muted)]">Receive updates about new features</p>
                  </div>
                  <div className="w-12 h-6 bg-[var(--accent-main)] rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-[var(--surface-main)] rounded-full shadow-sm" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-[var(--surface-main)] border border-[var(--border-main)] rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <History className="w-5 h-5 text-[var(--accent-main)]" />
                <h3 className="text-lg font-serif font-bold">Interaction History</h3>
              </div>
              <div className="space-y-3">
                {chatHistory.length > 0 ? (
                  chatHistory.slice(0, 5).map(chat => (
                    <button
                      key={chat.id}
                      onClick={() => onSelectChat(chat.id)}
                      className="w-full text-left p-3 rounded-xl hover:bg-[var(--border-main)] transition-colors group"
                    >
                      <p className="text-sm font-medium truncate group-hover:text-[var(--accent-main)]">{chat.title}</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">
                        {new Date(chat.last_updated).toLocaleDateString()}
                      </p>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-[var(--text-muted)] text-center py-4 italic">No recent activity</p>
                )}
                {chatHistory.length > 5 && (
                  <button className="w-full text-center text-xs font-bold text-[var(--accent-main)] pt-2 hover:underline">
                    View All History
                  </button>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-[var(--accent-main)] to-[var(--accent-secondary)] rounded-3xl p-6 text-white shadow-lg">
              <Zap className="w-8 h-8 mb-4" />
              <h4 className="text-lg font-bold mb-2">SuperNova Pro</h4>
              <p className="text-xs text-white/80 mb-6">Unlock advanced reasoning, image generation, and priority support.</p>
              <button className="w-full py-2.5 bg-[var(--surface-main)] text-[var(--accent-main)] rounded-xl text-sm font-bold hover:bg-opacity-90 transition-all">
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// --- Main App ---

const SUGGESTIONS = [
  "Design a system prompt for SuperNova AI",
  "Explain Coulomb's Law with vectors",
  "Draft a SaaS business plan outline",
  "Help me prep for JEE 2026",
];

const MODELS: Model[] = [
  { id: "gemini-3.1-pro-preview", name: "SuperNova Pro", icon: Sparkles, desc: "Complex reasoning & deep analysis" },
  { id: "gemini-3.1-flash-lite-preview", name: "SuperNova Lite", icon: Zap, desc: "Fast & efficient responses" },
];

const THEMES = [
  { id: "classic", name: "Classic", color: "#D97757" },
  { id: "dark", name: "Dark Mode", color: "#6366F1" },
  { id: "oceanic", name: "Oceanic", color: "#0EA5E9" },
];

const SuperNovaApp = () => {
  const { user, logout, loading } = useAuth();
  const { 
    chatHistory, activeChatId, messages, isTyping, selectedModel, useThinking,
    uploadedImage, isImageLoading, activeArtifact, artifactOpen, intelligenceMode,
    outputDepth, outputTone, outputFormat,
    loadChat, createNewChat, renameChat, deleteChat, handleSend, handleImageUpload,
    setUploadedImage, setSelectedModel, setUseThinking, setArtifactOpen, setActiveArtifact,
    setActiveChatId, setMessages, setIntelligenceMode,
    setOutputDepth, setOutputTone, setOutputFormat
  } = useChat();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [advancedOptionsOpen, setAdvancedOptionsOpen] = useState(false);
  const [theme, setTheme] = useState("classic");
  const [currentView, setCurrentView] = useState<"chat" | "profile" | "tasks" | "about" | "game" | "research" | "landing">("chat");
  const [editingChatId, setEditingChatId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [input, setInput] = useState("");
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const gemini = new GeminiService();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (user) {
      fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme })
      });
    }
  }, [theme, user]);

  useEffect(() => {
    if (user) {
      fetch("/api/preferences")
        .then(res => res.json())
        .then(data => {
          if (data?.theme) setTheme(data.theme);
        });
    }
  }, [user]);

  const onRenameChat = async (chatId: number) => {
    await renameChat(chatId, editTitle);
    setEditingChatId(null);
  };

  const onDeleteChat = async (e: React.MouseEvent, chatId: number) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this conversation?")) return;
    await deleteChat(chatId);
  };

  const onSend = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg && !uploadedImage) return;
    setInput("");
    await handleSend(msg);
  };

  const handleTTS = async (msg: Message) => {
    if (speakingMsgId === msg.id) {
      audioRef.current?.pause();
      setSpeakingMsgId(null);
      return;
    }

    setSpeakingMsgId(msg.id);
    try {
      const audioUrl = await gemini.generateSpeech(msg.content);
      if (audioUrl) {
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
        } else {
          audioRef.current = new Audio(audioUrl);
        }
        audioRef.current.onended = () => setSpeakingMsgId(null);
        audioRef.current.play();
      }
    } catch (err) {
      console.error("TTS failed", err);
      setSpeakingMsgId(null);
    }
  };

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-[var(--bg-main)]"><Sparkles className="w-8 h-8 text-[var(--accent-main)] animate-pulse" /></div>;

  return (
    <div className="flex h-screen w-full bg-[var(--bg-main)] text-[var(--text-main)] font-sans overflow-hidden">
      {/* Advanced Options Modal */}
      <AnimatePresence>
        {advancedOptionsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setAdvancedOptionsOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-[var(--bg-main)] border border-[var(--border-main)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-[var(--border-main)] flex justify-between items-center">
                <h2 className="text-xl font-serif font-semibold">Advanced Output Options</h2>
                <button onClick={() => setAdvancedOptionsOpen(false)} className="p-2 hover:bg-[var(--border-main)] rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">Depth</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["concise", "standard", "detailed"].map(d => (
                      <button
                        key={d}
                        onClick={() => setOutputDepth(d as any)}
                        className={`py-2 px-3 rounded-lg text-sm font-medium capitalize transition-all border ${
                          outputDepth === d 
                            ? "bg-[var(--accent-main)] text-white border-[var(--accent-main)]" 
                            : "bg-[var(--sidebar-bg)] text-[var(--text-main)] border-[var(--border-main)] hover:border-[var(--accent-main)]/50"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">Tone</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["professional", "casual", "academic", "enthusiastic"].map(t => (
                      <button
                        key={t}
                        onClick={() => setOutputTone(t as any)}
                        className={`py-2 px-3 rounded-lg text-sm font-medium capitalize transition-all border ${
                          outputTone === t 
                            ? "bg-[var(--accent-main)] text-white border-[var(--accent-main)]" 
                            : "bg-[var(--sidebar-bg)] text-[var(--text-main)] border-[var(--border-main)] hover:border-[var(--accent-main)]/50"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">Format</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["paragraph", "bullet_points", "markdown", "code"].map(f => (
                      <button
                        key={f}
                        onClick={() => setOutputFormat(f as any)}
                        className={`py-2 px-3 rounded-lg text-sm font-medium capitalize transition-all border ${
                          outputFormat === f 
                            ? "bg-[var(--accent-main)] text-white border-[var(--accent-main)]" 
                            : "bg-[var(--sidebar-bg)] text-[var(--text-main)] border-[var(--border-main)] hover:border-[var(--accent-main)]/50"
                        }`}
                      >
                        {f.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 260 : 0, opacity: sidebarOpen ? 1 : 0 }}
        className="flex flex-col bg-[var(--sidebar-bg)] border-r border-[var(--border-main)] overflow-hidden whitespace-nowrap"
      >
        <div className="p-5 flex items-center gap-3 border-b border-[var(--border-main)]">
          <div className="w-8 h-8 rounded-full bg-[var(--accent-main)]/10 flex items-center justify-center border border-[var(--accent-main)]/30">
            <Sparkles className="w-4 h-4 text-[var(--accent-main)]" />
          </div>
          <h1 className="text-lg font-serif font-semibold tracking-tight">
            Super<span className="text-[var(--accent-main)]">Nova</span> AI
          </h1>
        </div>

        <button 
          onClick={() => {
            createNewChat();
            setCurrentView("chat");
          }}
          className="mx-3 mt-4 mb-2 p-3 flex items-center gap-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl hover:shadow-md transition-all group"
        >
          <Plus className="w-4 h-4 text-[var(--accent-main)]" />
          <span className="text-sm font-medium">New conversation</span>
        </button>

        <button 
          onClick={() => setCurrentView("tasks")}
          className={`mx-3 mb-2 p-3 flex items-center gap-2 rounded-xl transition-all group ${currentView === "tasks" ? "bg-[var(--accent-main)] text-white shadow-md" : "bg-[var(--bg-main)] border border-[var(--border-main)] hover:shadow-md"}`}
        >
          <ListTodo className={`w-4 h-4 ${currentView === "tasks" ? "text-white" : "text-[var(--accent-main)]"}`} />
          <span className="text-sm font-medium">Task Management</span>
        </button>

        <button 
          onClick={() => setCurrentView("about")}
          className={`mx-3 mb-4 p-3 flex items-center gap-2 rounded-xl transition-all group ${currentView === "about" ? "bg-[var(--accent-main)] text-white shadow-md" : "bg-[var(--bg-main)] border border-[var(--border-main)] hover:shadow-md"}`}
        >
          <Info className={`w-4 h-4 ${currentView === "about" ? "text-white" : "text-[var(--accent-main)]"}`} />
          <span className="text-sm font-medium">About Us</span>
        </button>

        <button 
          onClick={() => setCurrentView("game")}
          className={`mx-3 mb-4 p-3 flex items-center gap-2 rounded-xl transition-all group ${currentView === "game" ? "bg-[var(--accent-main)] text-white shadow-md" : "bg-[var(--bg-main)] border border-[var(--border-main)] hover:shadow-md"}`}
        >
          <Gamepad className={`w-4 h-4 ${currentView === "game" ? "text-white" : "text-[var(--accent-main)]"}`} />
          <span className="text-sm font-medium">গেম এনপিসি</span>
        </button>

        <button 
          onClick={() => setCurrentView("research")}
          className={`mx-3 mb-4 p-3 flex items-center gap-2 rounded-xl transition-all group ${currentView === "research" ? "bg-[var(--accent-main)] text-white shadow-md" : "bg-[var(--bg-main)] border border-[var(--border-main)] hover:shadow-md"}`}
        >
          <Search className={`w-4 h-4 ${currentView === "research" ? "text-white" : "text-[var(--accent-main)]"}`} />
          <span className="text-sm font-medium">Research</span>
        </button>

        <button 
          onClick={() => setCurrentView("landing")}
          className={`mx-3 mb-4 p-3 flex items-center gap-2 rounded-xl transition-all group ${currentView === "landing" ? "bg-[var(--accent-main)] text-white shadow-md" : "bg-[var(--bg-main)] border border-[var(--border-main)] hover:shadow-md"}`}
        >
          <Sparkles className={`w-4 h-4 ${currentView === "landing" ? "text-white" : "text-[var(--accent-main)]"}`} />
          <span className="text-sm font-medium">Landing</span>
        </button>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Recent</div>
          {chatHistory.map(item => (
            <div
              key={item.id}
              onClick={() => {
                loadChat(item.id);
                setCurrentView("chat");
              }}
              className={`w-full text-left p-3 rounded-xl transition-colors group flex items-center gap-2 cursor-pointer ${
                activeChatId === item.id ? "bg-[var(--accent-main)]/10" : "hover:bg-[var(--accent-main)]/5"
              }`}
            >
              <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
                {editingChatId === item.id ? (
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <input 
                      autoFocus
                      className="bg-transparent border-b border-[var(--accent-main)] outline-none text-sm w-full"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") onRenameChat(item.id);
                        if (e.key === "Escape") setEditingChatId(null);
                      }}
                    />
                    <button onClick={() => onRenameChat(item.id)} className="text-[var(--accent-main)]"><Check className="w-3 h-3" /></button>
                  </div>
                ) : (
                  <span className="text-sm truncate font-normal">{item.title}</span>
                )}
                <span className="text-[10px] text-[var(--text-muted)]">{new Date(item.last_updated).toLocaleDateString()}</span>
              </div>
              
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingChatId(item.id);
                    setEditTitle(item.title);
                  }}
                  className="p-1 hover:bg-[var(--border-main)] rounded-lg"
                >
                  <Edit2 className="w-3 h-3 text-[var(--text-muted)]" />
                </button>
                <button 
                  onClick={(e) => onDeleteChat(e, item.id)}
                  className="p-1 hover:bg-red-500/10 hover:text-red-500 rounded-lg"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-[var(--border-main)] space-y-2">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Theme</div>
          <div className="flex gap-2 px-2">
            {THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${theme === t.id ? "border-[var(--accent-main)] scale-110" : "border-transparent"}`}
                style={{ backgroundColor: t.color }}
                title={t.name}
              />
            ))}
          </div>

          <div className="pt-2">
            {user ? (
              <div 
                onClick={() => setCurrentView("profile")}
                className={`flex items-center gap-3 p-2 rounded-xl transition-colors cursor-pointer group ${currentView === "profile" ? "bg-[var(--accent-main)]/10 border border-[var(--accent-main)]/20" : "hover:bg-[var(--border-main)]"}`}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent-main)] to-[var(--accent-secondary)] flex items-center justify-center text-white text-xs font-bold">
                  {user.name[0]}
                </div>
                <div className="flex flex-col flex-1 truncate">
                  <span className="text-sm font-medium truncate">{user.name}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">SuperNova Pro</span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    logout();
                    setCurrentView("chat");
                  }} 
                  className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setAuthModalOpen(true)}
                className="w-full p-3 flex items-center gap-2 bg-[var(--accent-main)] text-white rounded-xl font-bold shadow-lg hover:scale-[1.02] transition-transform"
              >
                <Lock className="w-4 h-4" />
                <span className="text-sm">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {currentView === "profile" ? (
          <ProfilePage 
            onBack={() => setCurrentView("chat")} 
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />
        ) : currentView === "tasks" ? (
          <TaskManagement onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        ) : currentView === "about" ? (
          <AboutUs 
            onBack={() => setCurrentView("chat")} 
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />
        ) : currentView === "game" ? (
          <NPCGame onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        ) : currentView === "research" ? (
          <ResearchMoodFutures onBack={() => setCurrentView("chat")} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        ) : currentView === "landing" ? (
          <LandingPage onGetStarted={() => setCurrentView("chat")} />
        ) : (
          <>
            {/* Topbar */}
            <header className="h-[52px] px-4 flex items-center gap-3 bg-[var(--bg-main)] border-b border-[var(--border-main)] z-10">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-[var(--border-main)] rounded-lg text-[var(--text-muted)] transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1 bg-[var(--sidebar-bg)] p-1 rounded-full border border-[var(--border-main)]">
            {MODELS.map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedModel(m)}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  selectedModel.id === m.id 
                    ? "bg-[var(--bg-main)] text-[var(--text-main)] shadow-sm border border-[var(--border-main)]" 
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }`}
              >
                <m.icon className={`w-3 h-3 ${selectedModel.id === m.id ? "text-[var(--accent-main)]" : ""}`} />
                {m.name}
              </button>
            ))}
          </div>

          <button
            onClick={() => setUseThinking(!useThinking)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ml-2 ${
              useThinking 
                ? "bg-[var(--accent-main)]/10 text-[var(--accent-main)] border border-[var(--accent-main)]/30" 
                : "text-[var(--text-muted)] hover:bg-[var(--border-main)] border border-transparent"
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            Thinking Mode
          </button>

          <button
            onClick={() => setIntelligenceMode(intelligenceMode === "research" ? "general" : "research")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ml-2 ${
              intelligenceMode === "research" 
                ? "bg-[var(--accent-main)]/10 text-[var(--accent-main)] border border-[var(--accent-main)]/30" 
                : "text-[var(--text-muted)] hover:bg-[var(--border-main)] border border-transparent"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Research Mode
          </button>

          <button
            onClick={() => setAdvancedOptionsOpen(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ml-2 ${
              advancedOptionsOpen 
                ? "bg-[var(--accent-main)]/10 text-[var(--accent-main)] border border-[var(--accent-main)]/30" 
                : "text-[var(--text-muted)] hover:bg-[var(--border-main)] border border-transparent"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Advanced
          </button>

          <button
            onClick={() => setArtifactOpen(!artifactOpen)}
            className={`ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              artifactOpen 
                ? "bg-[var(--accent-main)]/10 text-[var(--accent-main)] border-[var(--accent-main)]/30" 
                : "text-[var(--text-muted)] border-[var(--border-main)] hover:bg-[var(--border-main)]"
            }`}
          >
            {artifactOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            {artifactOpen ? "Hide Artifacts" : "Show Artifacts"}
          </button>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-[var(--bg-main)]">
          <div className="max-w-3xl mx-auto py-10 px-6">
            <AnimatePresence mode="popLayout">
              {messages.length === 1 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center text-center mt-12"
                >
                  <div className="w-16 h-16 rounded-3xl bg-[var(--accent-main)]/10 flex items-center justify-center border border-[var(--accent-main)]/20 mb-6">
                    <Sparkles className="w-8 h-8 text-[var(--accent-main)]" />
                  </div>
                  <h2 className="text-3xl font-serif font-semibold mb-2">What shall we build today?</h2>
                  <p className="text-[var(--text-muted)] mb-10 max-w-md">Your India-focused AI assistant. Ask me anything about coding, education, or business.</p>
                  
                  <div className="grid grid-cols-2 gap-3 w-full max-w-xl">
                    {SUGGESTIONS.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => onSend(s)}
                        className="p-4 text-left bg-[var(--bg-main)] border border-[var(--border-main)] rounded-2xl hover:border-[var(--accent-main)]/40 hover:shadow-md transition-all group"
                      >
                        <p className="text-sm text-[var(--text-main)] group-hover:text-[var(--accent-main)] transition-colors">{s}</p>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {messages.map((msg, idx) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mb-8 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex gap-4 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border ${
                      msg.role === "user" 
                        ? "bg-[var(--accent-main)] border-[var(--accent-main)] text-white" 
                        : "bg-[var(--bg-main)] border border-[var(--border-main)] text-[var(--accent-main)]"
                    }`}>
                      {msg.role === "user" ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className={`p-4 rounded-2xl relative group/msg ${
                        msg.role === "user" 
                          ? "bg-[var(--accent-main)] text-white rounded-tr-none" 
                          : "bg-[var(--bg-main)] border border-[var(--border-main)] text-[var(--text-main)] rounded-tl-none shadow-sm"
                      }`}>
                        {msg.isThinking && msg.role === "assistant" && (
                          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[var(--border-main)]/50 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                            <Brain className="w-3 h-3" />
                            Thinking Process
                          </div>
                        )}
                        <div className="prose prose-sm max-w-none prose-neutral dark:prose-invert">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>

                        {msg.role === "assistant" && (
                          <button 
                            onClick={() => handleTTS(msg)}
                            className={`absolute -right-10 top-0 p-2 rounded-lg transition-all opacity-0 group-hover/msg:opacity-100 ${
                              speakingMsgId === msg.id ? "text-[var(--accent-main)] opacity-100" : "text-[var(--text-muted)] hover:bg-[var(--border-main)]"
                            }`}
                            title="Listen to message"
                          >
                            {speakingMsgId === msg.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Volume2 className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                      <span className={`text-[10px] text-[var(--text-muted)] ${msg.role === "user" ? "text-right" : "text-left"}`}>
                        {msg.time}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}

              {isTyping && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-4 mb-8"
                >
                  <div className="w-8 h-8 rounded-full bg-[var(--bg-main)] border border-[var(--border-main)] flex items-center justify-center text-[var(--accent-main)]">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="bg-[var(--bg-main)] border border-[var(--border-main)] p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-1.5 items-center">
                      <span className="w-1.5 h-1.5 bg-[var(--accent-main)] rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
                      <span className="w-1.5 h-1.5 bg-[var(--accent-main)] rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                      <span className="w-1.5 h-1.5 bg-[var(--accent-main)] rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-6 bg-[var(--bg-main)] border-t border-[var(--border-main)]">
          <div className="max-w-3xl mx-auto relative">
            <AnimatePresence>
              {isImageLoading && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute bottom-full mb-4 left-0 p-3 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-2xl shadow-xl flex items-center gap-3 min-w-[140px]"
                >
                  <div className="w-10 h-10 rounded-lg bg-[var(--accent-main)]/10 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-[var(--accent-main)] animate-spin" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">Processing...</span>
                    <span className="text-[10px] text-[var(--text-muted)]">Optimizing image</span>
                  </div>
                </motion.div>
              )}

              {uploadedImage && !isImageLoading && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute bottom-full mb-4 left-0 p-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-2xl shadow-xl flex items-center gap-3 group"
                >
                  <div className="relative">
                    <img 
                      src={`data:image/png;base64,${uploadedImage.data}`} 
                      alt="Upload preview" 
                      className="w-16 h-16 rounded-xl object-cover border border-[var(--border-main)]"
                      referrerPolicy="no-referrer"
                    />
                    <button 
                      onClick={() => setUploadedImage(null)}
                      className="absolute -top-2 -right-2 p-1.5 bg-[var(--surface-main)] border border-[var(--border-main)] rounded-full text-[var(--text-muted)] hover:text-red-500 hover:border-red-200 shadow-sm transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="pr-4">
                    <p className="text-xs font-bold truncate max-w-[120px]">Image Ready</p>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-medium">Click send to analyze</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative flex items-end gap-2 bg-[var(--sidebar-bg)] border border-[var(--border-main)] rounded-2xl p-2 focus-within:border-[var(--accent-main)] focus-within:ring-2 focus-within:ring-[var(--accent-main)]/10 transition-all">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-[var(--text-muted)] hover:text-[var(--accent-main)] transition-colors"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                className="hidden" 
                accept="image/*" 
              />
              
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
                placeholder="Message SuperNova AI..."
                className="flex-1 bg-transparent border-none outline-none py-2.5 px-2 text-sm resize-none min-h-[44px] max-h-40"
                rows={1}
                style={{ height: "auto" }}
                onInput={(e: any) => {
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
                }}
              />

              <button
                onClick={() => onSend()}
                disabled={(!input.trim() && !uploadedImage) || isTyping}
                className={`p-2.5 rounded-xl transition-all ${
                  (input.trim() || uploadedImage) && !isTyping
                    ? "bg-[var(--accent-main)] text-white shadow-md hover:scale-105 active:scale-95"
                    : "bg-[var(--border-main)] text-[var(--text-muted)] cursor-not-allowed"
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] text-center mt-3">
              SuperNova AI can make mistakes. Verify important information.
            </p>
          </div>
        </div>

        {/* Artifact Drawer */}
        <AnimatePresence>
          {artifactOpen && (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-[420px] bg-[var(--bg-main)] border-l border-[var(--border-main)] shadow-2xl z-20 flex flex-col"
            >
              <div className="h-[52px] px-5 flex items-center justify-between border-b border-[var(--border-main)]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[var(--accent-main)]/10 flex items-center justify-center border border-[var(--accent-main)]/20">
                    <Sparkles className="w-3 h-3 text-[var(--accent-main)]" />
                  </div>
                  <h3 className="text-sm font-semibold font-serif">Artifact Panel</h3>
                </div>
                <button 
                  onClick={() => setArtifactOpen(false)}
                  className="p-1.5 hover:bg-[var(--border-main)] rounded-lg text-[var(--text-muted)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-[var(--bg-main)]">
                {activeArtifact ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {activeArtifact}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                    <PanelRightOpen className="w-12 h-12 mb-4" />
                    <p className="text-sm">No active artifacts to display.</p>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-[var(--border-main)] bg-[var(--bg-main)] text-[10px] text-[var(--text-muted)] text-center">
                SuperNova AI — Artifact View v2.0
              </div>
            </motion.div>
          )}
        </AnimatePresence>
          </>
        )}
      </main>
    </div>
  );
};

const AppContent = () => {
  const { user } = useAuth();
  return (
    <ChatProvider user={user}>
      <SuperNovaApp />
    </ChatProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
