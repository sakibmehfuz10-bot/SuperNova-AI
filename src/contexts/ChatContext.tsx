import React, { createContext, useContext, useState, useRef, useEffect } from "react";
import { GeminiService, Message } from "../services/geminiService";

export interface ChatHistoryItem {
  id: number;
  title: string;
  last_updated: string;
}

export type IntelligenceMode = "general" | "research" | "coder" | "india_expert";
export type OutputDepth = "concise" | "standard" | "detailed";
export type OutputTone = "professional" | "casual" | "academic" | "enthusiastic";
export type OutputFormat = "paragraph" | "bullet_points" | "markdown" | "code";

export interface Model {
  id: string;
  name: string;
  icon: any;
  desc: string;
}

interface ChatContextType {
  chatHistory: ChatHistoryItem[];
  activeChatId: number | null;
  messages: Message[];
  isTyping: boolean;
  isQuotaExceeded: boolean;
  setIsQuotaExceeded: (val: boolean) => void;
  selectedModel: Model;
  intelligenceMode: IntelligenceMode;
  useThinking: boolean;
  outputDepth: OutputDepth;
  outputTone: OutputTone;
  outputFormat: OutputFormat;
  uploadedImage: { data: string; mimeType: string } | null;
  isImageLoading: boolean;
  activeArtifact: string | null;
  artifactOpen: boolean;

  fetchChats: () => Promise<void>;
  loadChat: (chatId: number) => Promise<void>;
  createNewChat: () => Promise<void>;
  renameChat: (chatId: number, title: string) => Promise<void>;
  deleteChat: (chatId: number) => Promise<void>;
  handleSend: (text?: string) => Promise<void>;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;

  setUploadedImage: (img: { data: string; mimeType: string } | null) => void;
  setSelectedModel: (model: Model) => void;
  setIntelligenceMode: (mode: IntelligenceMode) => void;
  setUseThinking: (use: boolean) => void;
  setOutputDepth: (depth: OutputDepth) => void;
  setOutputTone: (tone: OutputTone) => void;
  setOutputFormat: (format: OutputFormat) => void;
  setArtifactOpen: (open: boolean) => void;
  setActiveArtifact: (artifact: string | null) => void;
  setActiveChatId: (id: number | null) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within a ChatProvider");
  return context;
};

export const ChatProvider: React.FC<{ children: React.ReactNode; user: any }> = ({ children, user }) => {
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "assistant",
      content: "Hello! I'm SuperNova — your ultimate intelligence orchestrator. How can I empower your potential today?",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
  ]);
  const[isTyping, setIsTyping] = useState(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  
  // ৩. মডেল আইডি পরিবর্তন করা হয়েছে (gemini-1.5-pro)
  const [selectedModel, setSelectedModel] = useState<Model>({ id: "gemini-1.5-pro", name: "SuperNova Pro", icon: null, desc: "" });
  
  const [intelligenceMode, setIntelligenceMode] = useState<IntelligenceMode>("general");
  const[useThinking, setUseThinking] = useState(false);
  const [outputDepth, setOutputDepth] = useState<OutputDepth>("standard");
  const [outputTone, setOutputTone] = useState<OutputTone>("professional");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("markdown");
  const[uploadedImage, setUploadedImage] = useState<{ data: string; mimeType: string } | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const[activeArtifact, setActiveArtifact] = useState<string | null>(null);
  const [artifactOpen, setArtifactOpen] = useState(false);

  const gemini = useRef(new GeminiService());

  const fetchChats = async () => {
    if (!user) return;
    const res = await fetch("/api/chats");
    if (res.ok) {
      const data = await res.json();
      setChatHistory(data);
    }
  };

  const loadChat = async (chatId: number) => {
    setActiveChatId(chatId);
    const res = await fetch(`/api/chats/${chatId}/messages`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.length > 0 ? data.map((m: any, i: number) => ({ ...m, id: i.toString() })) :[
        {
          id: "init",
          role: "assistant",
          content: "Hello! I'm SuperNova — your ultimate intelligence orchestrator. How can I empower your potential today?",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }
      ]);
    }
  };

  const createNewChat = async () => {
    if (!user) {
      setMessages([
        {
          id: "init",
          role: "assistant",
          content: "Hello! I'm SuperNova — your ultimate intelligence orchestrator. How can I empower your potential today?",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }
      ]);
      setActiveChatId(null);
      return;
    }

    const res = await fetch("/api/chats", {  
      method: "POST",  
      headers: { "Content-Type": "application/json" },  
      body: JSON.stringify({ title: "New Conversation" })  
    });  
    if (res.ok) {  
      const data = await res.json();  
      setChatHistory([data, ...chatHistory]);  
      setActiveChatId(data.id);  
      setMessages([  
        {  
          id: "init",  
          role: "assistant",  
          content: "Hello! I'm SuperNova — your ultimate intelligence orchestrator. How can I empower your potential today?",  
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),  
        }  
      ]);  
    }
  };

  const renameChat = async (chatId: number, title: string) => {
    const res = await fetch(`/api/chats/${chatId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title })
    });
    if (res.ok) {
      setChatHistory(prev => prev.map(c => c.id === chatId ? { ...c, title } : c));
    }
  };

  const deleteChat = async (chatId: number) => {
    const res = await fetch(`/api/chats/${chatId}`, { method: "DELETE" });
    if (res.ok) {
      setChatHistory(prev => prev.filter(c => c.id !== chatId));
      if (activeChatId === chatId) {
        createNewChat();
      }
    }
  };

  const handleSend = async (text?: string) => {
    const msg = text || "";
    if (!msg && !uploadedImage) return;

    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });  
    const userMsg: Message = {  
      id: Date.now().toString(),  
      role: "user",  
      content: msg,  
      time,  
    };  

    setMessages(prev => [...prev, userMsg]);  
    setIsTyping(true);  
    const currentImage = uploadedImage;  
    setUploadedImage(null);  

    let currentChatId = activeChatId;  

    if (user && !currentChatId) {  
      const res = await fetch("/api/chats", {  
        method: "POST",  
        headers: { "Content-Type": "application/json" },  
        body: JSON.stringify({ title: msg.substring(0, 30) + (msg.length > 30 ? "..." : "") })  
      });  
      if (res.ok) {  
        const data = await res.json();  
        setChatHistory(prev => [data, ...prev]);  
        setActiveChatId(data.id);  
        currentChatId = data.id;  
      }  
    }  

    if (user && currentChatId) {  
      await fetch(`/api/chats/${currentChatId}/messages`, {  
        method: "POST",  
        headers: { "Content-Type": "application/json" },  
        body: JSON.stringify({ role: "user", content: msg, time })  
      });  
        
      if (messages.length === 1 && !activeChatId) {  
        // Title already set  
      } else if (messages.length === 1) {  
        const newTitle = msg.length > 30 ? msg.substring(0, 30) + "..." : msg;  
        await fetch(`/api/chats/${currentChatId}`, {  
          method: "PATCH",  
          headers: { "Content-Type": "application/json" },  
          body: JSON.stringify({ title: newTitle })  
        });  
        setChatHistory(prev => prev.map(c => c.id === currentChatId ? { ...c, title: newTitle } : c));  
      }  
    }  

    try {  
      // ১. আপনার নিজের সার্ভারকে কল করা হচ্ছে
      const apiResponse = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: msg,
          messages: messages, // চ্যাট হিস্ট্রি পাঠানো হচ্ছে
          model: selectedModel.id,
          mode: intelligenceMode,
          useThinking: useThinking,
          depth: outputDepth,
          tone: outputTone,
          format: outputFormat,
          image: currentImage || undefined
        })
      });

      if (!apiResponse.ok) throw new Error("SERVER_ERROR");

      const data = await apiResponse.json();
      const responseText = data.text; // আপনার server.ts থেকে আসা উত্তর

      const codeBlockMatch = responseText.match(/```[\s\S]*?```/);  
      if (codeBlockMatch) {  
        setActiveArtifact(codeBlockMatch[0]);  
        setArtifactOpen(true);  
      }  

      const assistantMsg: Message = {  
        id: (Date.now() + 1).toString(),  
        role: "assistant",  
        content: responseText,  
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),  
        isThinking: useThinking  
      };  

      setMessages(prev =>[...prev, assistantMsg]);  

      if (user && currentChatId) {  
        await fetch(`/api/chats/${currentChatId}/messages`, {  
          method: "POST",  
          headers: { "Content-Type": "application/json" },  
          body: JSON.stringify({ role: "assistant", content: responseText, time: assistantMsg.time })  
        });  
      }  
    } catch (error: any) {  
      // ২. বিভ্রান্তিকর এরর মেসেজ মুছে সহজ মেসেজ দেওয়া হয়েছে
      const errorMessage = "দুঃখিত, সুপারনোভা এই মুহূর্তে কানেক্ট করতে পারছে না। আপনার ইন্টারনেট বা সার্ভার চেক করুন।";
          
      setMessages(prev =>[...prev, {  
        id: "error",  
        role: "assistant",  
        content: errorMessage,  
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),  
      }]);  
    } finally {  
      setIsTyping(false);  
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsImageLoading(true);
      const reader = new FileReader();
      reader.onloadstart = () => setIsImageLoading(true);
      reader.onloadend = () => {
        setUploadedImage({
          data: (reader.result as string).split(",")[1],
          mimeType: file.type
        });
        setIsImageLoading(false);
      };
      reader.onerror = () => {
        setIsImageLoading(false);
        alert("Failed to read image");
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (user) {
      fetchChats();
    } else {
      setChatHistory([]);
      setActiveChatId(null);
    }
  }, [user]);

  return (
    <ChatContext.Provider value={{
      chatHistory, activeChatId, messages, isTyping, isQuotaExceeded, setIsQuotaExceeded, selectedModel, intelligenceMode, useThinking,
      outputDepth, outputTone, outputFormat,
      uploadedImage, isImageLoading, activeArtifact, artifactOpen,
      fetchChats, loadChat, createNewChat, renameChat, deleteChat, handleSend, handleImageUpload,
      setUploadedImage, setSelectedModel, setIntelligenceMode, setUseThinking,
      setOutputDepth, setOutputTone, setOutputFormat,
      setArtifactOpen, setActiveArtifact,
      setActiveChatId, setMessages
    }}>
      {children}
    </ChatContext.Provider>
  );
};
