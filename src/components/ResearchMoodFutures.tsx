import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Sparkles, Search, Loader2, Menu, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

export const ResearchMoodFutures: React.FC<{ onBack: () => void; onToggleSidebar: () => void }> = ({ onBack, onToggleSidebar }) => {
  const [data, setData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMoodFutures = async () => {
    setLoading(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: 'What are the current research trends and future predictions for AI in India? Use Google Search to provide up-to-date information.',
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      setData(response.text || 'No data found.');
    } catch (err) {
      setError('Failed to fetch research mood futures.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 overflow-y-auto p-8 bg-[var(--bg-main)]"
    >
      <div className="max-w-4xl mx-auto">
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

        <div className="p-8 bg-[var(--surface-main)] border border-[var(--border-main)] rounded-3xl shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-[var(--accent-main)]/10 rounded-xl">
              <Search className="w-6 h-6 text-[var(--accent-main)]" />
            </div>
            <h2 className="text-2xl font-serif font-bold">Research Mood Futures</h2>
          </div>
          
          <button
            onClick={fetchMoodFutures}
            disabled={loading}
            className="px-6 py-3 bg-[var(--accent-main)] text-white rounded-xl font-bold hover:scale-[1.02] transition-transform flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {loading ? 'Analyzing Trends...' : 'Fetch Research Insights'}
          </button>

          {error && <p className="mt-4 text-red-500">{error}</p>}
          
          {data && (
            <div className="mt-6 p-6 bg-[var(--surface-hover)] rounded-2xl border border-[var(--border-main)]">
              <div className="prose prose-sm max-w-none text-[var(--text-main)]">
                {data}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
