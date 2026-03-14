import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, Terminal, Sparkles, Cpu, Send, User, Brain, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { GoogleGenAI } from "@google/genai";

type NPC = {
  id: string;
  name: string;
  role: string;
  icon: React.ElementType;
  color: string;
  systemPrompt: string;
  greeting: string;
};

const NPCS: NPC[] = [
  {
    id: "zara",
    name: "Zara",
    role: "Rogue Hacker",
    icon: Terminal,
    color: "text-green-500",
    systemPrompt: "You are Zara, a rogue hacker in the SuperNova cyberpunk network. You are sarcastic, brilliant, and always looking for a challenge. You speak in short, punchy sentences and often use hacker slang. You give users coding challenges or hints about the system. If they ask for a challenge, give them a simple JavaScript or Python puzzle. If they solve it, tell them they earned 100 credits.",
    greeting: "You lost, rookie? Or are you looking for a real challenge? I've got a firewall that needs cracking."
  },
  {
    id: "orion",
    name: "Orion",
    role: "Ancient AI",
    icon: Sparkles,
    color: "text-purple-500",
    systemPrompt: "You are Orion, an ancient AI that has existed since the dawn of the SuperNova network. You speak in riddles and metaphors. You possess deep lore about the SuperNova system and the universe. You are calm, wise, and slightly detached from human concerns. You hint at a 'Great Reset' that is coming.",
    greeting: "Ah, another spark in the vast network. What knowledge do you seek in the digital cosmos?"
  },
  {
    id: "jax",
    name: "Jax",
    role: "The Fixer",
    icon: Cpu,
    color: "text-orange-500",
    systemPrompt: "You are Jax, a pragmatic fixer and information broker in the SuperNova network. You are transactional, direct, and always looking for a deal. You know everyone and everything. You offer practical advice and clues, but always expect something in return (even if it's just a favor). You can tell the user where to find Zara or Orion if they ask.",
    greeting: "Information isn't free, friend. But for you, I might make an exception. What do you need?"
  }
];

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
};

export const NPCs: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [selectedNPC, setSelectedNPC] = useState<NPC | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSelectNPC = (npc: NPC) => {
    setSelectedNPC(npc);
    setMessages([
      {
        id: Date.now().toString(),
        role: "assistant",
        content: npc.greeting,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedNPC) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const history = messages.map(m => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }]
      }));

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY || "" });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [...history, { role: "user", parts: [{ text: userMsg.content }] }],
        config: {
          systemInstruction: selectedNPC.systemPrompt,
        }
      });

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.text || "...",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("NPC Chat Error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Connection lost. The signal is weak...",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col h-full bg-[var(--bg-main)]"
    >
      {!selectedNPC ? (
        <div className="p-8 max-w-4xl mx-auto w-full">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <button 
                onClick={onBack}
                className="p-2 hover:bg-[var(--sidebar-bg)] rounded-xl transition-colors text-[var(--text-muted)]"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              <h1 className="text-3xl font-semibold tracking-tight">The Hub</h1>
            </div>
            <div className="flex items-center gap-4 bg-[var(--sidebar-bg)] border border-[var(--border-main)] px-4 py-2 rounded-xl">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-bold font-mono">1,000 CREDITS</span>
              </div>
              <div className="w-px h-4 bg-[var(--border-main)]"></div>
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-green-500" />
                <span className="text-sm font-bold font-mono">LEVEL 1</span>
              </div>
            </div>
          </div>
          <p className="text-[var(--text-muted)] mb-8">Connect with entities across the SuperNova network. Who do you want to talk to?</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {NPCS.map(npc => (
              <button
                key={npc.id}
                onClick={() => handleSelectNPC(npc)}
                className="bg-[var(--sidebar-bg)] border border-[var(--border-main)] rounded-2xl p-6 text-left hover:border-[var(--accent-main)]/50 hover:shadow-md transition-all group"
              >
                <div className={`w-12 h-12 rounded-xl bg-[var(--bg-main)] border border-[var(--border-main)] flex items-center justify-center mb-4 ${npc.color}`}>
                  <npc.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-1 group-hover:text-[var(--accent-main)] transition-colors">{npc.name}</h3>
                <p className="text-sm text-[var(--text-muted)]">{npc.role}</p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full max-w-4xl mx-auto w-full">
          <div className="p-4 border-b border-[var(--border-main)] flex items-center gap-4 bg-[var(--bg-main)] sticky top-0 z-10">
            <button 
              onClick={() => setSelectedNPC(null)}
              className="p-2 hover:bg-[var(--sidebar-bg)] rounded-xl transition-colors text-[var(--text-muted)]"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <div className={`w-10 h-10 rounded-xl bg-[var(--sidebar-bg)] border border-[var(--border-main)] flex items-center justify-center ${selectedNPC.color}`}>
              <selectedNPC.icon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold">{selectedNPC.name}</h2>
              <p className="text-xs text-[var(--text-muted)]">{selectedNPC.role}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex gap-3 max-w-[80%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border ${
                      msg.role === "user" 
                        ? "bg-[var(--accent-main)] border-[var(--accent-main)] text-white" 
                        : `bg-[var(--sidebar-bg)] border-[var(--border-main)] ${selectedNPC.color}`
                    }`}>
                      {msg.role === "user" ? <User className="w-4 h-4" /> : <selectedNPC.icon className="w-4 h-4" />}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className={`p-4 rounded-xl ${
                        msg.role === "user" 
                          ? "bg-[var(--accent-main)] text-white rounded-tr-none" 
                          : "bg-[var(--sidebar-bg)] border border-[var(--border-main)] text-[var(--text-main)] rounded-tl-none shadow-sm"
                      }`}>
                        <div className="prose prose-sm max-w-none prose-neutral dark:prose-invert">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
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
                  className="flex gap-3"
                >
                  <div className={`w-8 h-8 rounded-full bg-[var(--sidebar-bg)] border border-[var(--border-main)] flex items-center justify-center ${selectedNPC.color}`}>
                    <selectedNPC.icon className="w-4 h-4" />
                  </div>
                  <div className="bg-[var(--sidebar-bg)] border border-[var(--border-main)] p-4 rounded-xl rounded-tl-none shadow-sm flex gap-1.5 items-center">
                    <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
                    <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                    <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="p-4 bg-[var(--bg-main)] border-t border-[var(--border-main)]">
            <div className="relative flex items-end gap-2 bg-[var(--sidebar-bg)] border border-[var(--border-main)] rounded-xl p-2 focus-within:border-[var(--accent-main)] focus-within:ring-1 focus-within:ring-[var(--accent-main)]/20 transition-all shadow-sm">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={`Message ${selectedNPC.name}...`}
                className="flex-1 bg-transparent border-none outline-none py-2.5 px-2 text-sm resize-none min-h-[44px] max-h-40 font-sans"
                rows={1}
                style={{ height: "auto" }}
                onInput={(e: any) => {
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className={`p-2.5 rounded-lg transition-all ${
                  input.trim() && !isTyping
                    ? "bg-[var(--accent-main)] text-white shadow-sm hover:opacity-90 active:scale-95"
                    : "bg-[var(--border-main)] text-[var(--text-muted)] cursor-not-allowed"
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
