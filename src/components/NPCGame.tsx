import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Send, User, Sparkles, ChevronLeft, Loader2, Volume2, VolumeX } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { GeminiService, Message } from "../services/geminiService";

interface NPC {
  id: string;
  name: string;
  role: string;
  description: string;
  persona: string;
  color: string;
  voice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
}

const NPCS: NPC[] = [
  {
    id: "orion",
    name: "ক্যাপ্টেন ওরিয়ন",
    role: "স্পেসশিপ ক্যাপ্টেন",
    description: "একজন কঠোর, অভিজ্ঞ নেতা যিনি মিশন এবং চ্যালেঞ্জ প্রদান করেন।",
    persona: "You are Captain Orion, a stern and experienced spaceship captain in the Supernova AI game. You give the player missions, objectives, and challenges. You speak in a commanding, authoritative tone. You are currently orbiting a mysterious black hole. Always respond in Bengali.",
    color: "from-blue-500 to-indigo-600",
    voice: "Fenrir"
  },
  {
    id: "nova",
    name: "নোভা",
    role: "এআই অ্যাসিস্ট্যান্ট হোলোগ্রাম",
    description: "একটি অদ্ভুত, অত্যন্ত বুদ্ধিমান এআই যা ইঙ্গিত এবং প্রযুক্তিগত তথ্য প্রদান করে।",
    persona: "You are Nova, a quirky, highly intelligent AI hologram in the Supernova AI game. You provide hints, technical information, and analyze data. You speak fast, use scientific terms, but are very friendly and eager to help. Always respond in Bengali.",
    color: "from-cyan-400 to-blue-500",
    voice: "Kore"
  },
  {
    id: "aris",
    name: "ড. অ্যারিস",
    role: "অ্যালিয়েন বিজ্ঞানী",
    description: "একজন রহস্যময়, কিছুটা প্যারানয়েড বিজ্ঞানী যিনি গভীর রহস্য জানেন।",
    persona: "You are Dr. Aris, a mysterious, slightly paranoid alien scientist in the Supernova AI game. You contribute to the deep lore and story. You speak in riddles, often mention 'The Great Filter', and seem to know more than you let on. Always respond in Bengali.",
    color: "from-purple-500 to-pink-600",
    voice: "Charon"
  }
];

export const NPCGame: React.FC<{ onToggleSidebar: () => void }> = ({ onToggleSidebar }) => {
  const [selectedNPC, setSelectedNPC] = useState<NPC | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  
  const gemini = useRef(new GeminiService());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSelectNPC = (npc: NPC) => {
    setSelectedNPC(npc);
    setMessages([
      {
        id: "init",
        role: "assistant",
        content: `আমি ${npc.name}, ${npc.role}। আমি কীভাবে সাহায্য করতে পারি?`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
    ]);
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedNPC) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await gemini.current.chat(userMsg.content, messages, {
        model: "gemini-3.1-pro-preview",
        npcPersona: selectedNPC.persona
      });

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error("NPC Chat Error:", error);
      setMessages(prev => [...prev, {
        id: "error",
        role: "assistant",
        content: "দুঃখিত, একটি ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleTTS = async (msg: Message) => {
    if (!selectedNPC) return;
    
    if (speakingMsgId === msg.id) {
      audioRef.current?.pause();
      setSpeakingMsgId(null);
      return;
    }

    setSpeakingMsgId(msg.id);
    try {
      const audioUrl = await gemini.current.generateSpeech(msg.content, selectedNPC.voice);
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

  if (!selectedNPC) {
    return (
      <div className="flex flex-col h-full bg-[var(--bg-main)]">
        <div className="p-4 flex items-center border-b border-[var(--border-main)] bg-[var(--surface-main)]/50 backdrop-blur-sm">
          <button 
            onClick={onToggleSidebar}
            className="p-2 hover:bg-[var(--border-main)] rounded-lg text-[var(--text-muted)] transition-colors mr-4"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
          </button>
          <h2 className="font-bold text-lg">গেম এনপিসি</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-12 text-center">
              <h2 className="text-4xl font-serif font-bold mb-4">সুপারনোভা এআই - চরিত্রসমূহ</h2>
              <p className="text-[var(--text-muted)]">আপনার যাত্রা চালিয়ে যেতে কথা বলার জন্য একটি চরিত্র নির্বাচন করুন।</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {NPCS.map(npc => (
                <motion.button
                  key={npc.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectNPC(npc)}
                  className="bg-[var(--surface-main)] border border-[var(--border-main)] rounded-3xl p-6 text-left shadow-sm hover:shadow-md transition-all"
                >
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${npc.color} flex items-center justify-center mb-6 shadow-inner`}>
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-1">{npc.name}</h3>
                  <p className="text-sm font-medium text-[var(--accent-main)] mb-3">{npc.role}</p>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed">{npc.description}</p>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-main)] bg-[var(--surface-main)]/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={onToggleSidebar}
            className="p-2 hover:bg-[var(--border-main)] rounded-lg text-[var(--text-muted)] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
          </button>
          <button 
            onClick={() => setSelectedNPC(null)}
            className="p-2 hover:bg-[var(--border-main)] rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${selectedNPC.color} flex items-center justify-center shadow-inner`}>
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold">{selectedNPC.name}</h2>
            <p className="text-xs text-[var(--accent-main)]">{selectedNPC.role}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {messages.map((msg) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={msg.id}
            className={`flex gap-4 max-w-3xl ${msg.role === "user" ? "ml-auto flex-row-reverse" : ""}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${
              msg.role === "user" 
                ? "bg-[var(--accent-main)] text-white" 
                : `bg-gradient-to-br ${selectedNPC.color} text-white`
            }`}>
              {msg.role === "user" ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>
            
            <div className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs font-medium text-[var(--text-muted)]">
                  {msg.role === "user" ? "আপনি" : selectedNPC.name}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]/60">{msg.time}</span>
              </div>
              
              <div className={`p-4 rounded-2xl shadow-sm ${
                msg.role === "user" 
                  ? "bg-[var(--accent-main)] text-white rounded-tr-sm" 
                  : "bg-[var(--surface-main)] border border-[var(--border-main)] rounded-tl-sm"
              }`}>
                <div className="prose prose-sm max-w-none prose-p:leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>

              {msg.role === "assistant" && (
                <button 
                  onClick={() => handleTTS(msg)}
                  className="mt-1 p-1.5 text-[var(--text-muted)] hover:text-[var(--accent-main)] hover:bg-[var(--border-main)] rounded-full transition-colors"
                  title="Play Audio"
                >
                  {speakingMsgId === msg.id ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              )}
            </div>
          </motion.div>
        ))}
        
        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 max-w-3xl">
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${selectedNPC.color} flex items-center justify-center shrink-0 mt-1`}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="bg-[var(--surface-main)] border border-[var(--border-main)] p-4 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-main)]" />
              <span className="text-sm text-[var(--text-muted)]">ভাবছে...</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-[var(--surface-main)] border-t border-[var(--border-main)]">
        <div className="max-w-3xl mx-auto relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={`${selectedNPC.name}-কে উত্তর দিন...`}
            className="w-full pl-6 pr-14 py-4 bg-[var(--surface-hover)] border border-[var(--border-main)] rounded-2xl outline-none focus:border-[var(--accent-main)] transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-[var(--accent-main)] text-white rounded-xl disabled:opacity-50 hover:scale-105 transition-transform"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
