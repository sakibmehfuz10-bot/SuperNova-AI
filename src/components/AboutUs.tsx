import React from "react";
import { motion } from "motion/react";
import { ChevronRight, Globe, Target, Zap, Heart, Shield, Sparkles, Menu } from "lucide-react";

export const AboutUs: React.FC<{ onBack: () => void; onToggleSidebar?: () => void }> = ({ onBack, onToggleSidebar }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 overflow-y-auto p-8 bg-[var(--bg-main)] relative"
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          {onToggleSidebar && (
            <button 
              onClick={onToggleSidebar}
              className="p-2 hover:bg-[var(--border-main)] rounded-lg text-[var(--text-muted)] transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--accent-main)] transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back to Chat
          </button>
        </div>

        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--accent-main)]/10 mb-6 border border-[var(--accent-main)]/20">
            <Sparkles className="w-8 h-8 text-[var(--accent-main)]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-6 tracking-tight">
            About <span className="text-[var(--accent-main)]">SuperNova</span> AI
          </h1>
          <p className="text-lg text-[var(--text-muted)] max-w-2xl mx-auto leading-relaxed">
            The Ultimate Intelligence Orchestrator — a world-class AI assistant engineered for precision, depth, and actionable insight with an India-first focus.
          </p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16"
        >
          <motion.div 
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
            className="bg-[var(--surface-main)] border border-[var(--border-main)] rounded-3xl p-8 shadow-sm hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
              <Target className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-serif font-bold mb-4">Our Mission</h2>
            <p className="text-[var(--text-muted)] leading-relaxed">
              To democratize access to world-class artificial intelligence, empowering individuals and businesses to solve complex problems, accelerate innovation, and achieve unprecedented productivity through intuitive, intelligent orchestration.
            </p>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
            className="bg-[var(--surface-main)] border border-[var(--border-main)] rounded-3xl p-8 shadow-sm hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-6">
              <Globe className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-serif font-bold mb-4">Our Vision</h2>
            <p className="text-[var(--text-muted)] leading-relaxed">
              To be the cognitive engine that powers the next generation of human-AI collaboration, creating a future where technology seamlessly amplifies human potential and creativity across every domain.
            </p>
          </motion.div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-br from-[var(--accent-main)] to-[var(--accent-secondary)] rounded-3xl p-10 text-white shadow-xl mb-16 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-serif font-bold">India-First Approach</h2>
            </div>
            <p className="text-lg text-white/90 leading-relaxed mb-8 max-w-2xl">
              We are proudly building for Bharat. SuperNova AI is designed with a deep understanding of India's unique linguistic diversity, cultural nuances, and dynamic market needs.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                <h3 className="font-bold mb-2">Multilingual Core</h3>
                <p className="text-sm text-white/80">Native support for major Indian languages, breaking down communication barriers.</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                <h3 className="font-bold mb-2">Local Context</h3>
                <p className="text-sm text-white/80">Trained on localized data to understand regional nuances, idioms, and cultural references.</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                <h3 className="font-bold mb-2">Frugal Innovation</h3>
                <p className="text-sm text-white/80">Optimized for low-bandwidth environments and accessible across diverse devices.</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl font-serif font-bold mb-8">Core Values</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex flex-col items-center p-6">
              <div className="w-12 h-12 rounded-full bg-[var(--accent-main)]/10 text-[var(--accent-main)] flex items-center justify-center mb-4">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="font-bold mb-2">Trust & Privacy</h3>
              <p className="text-sm text-[var(--text-muted)]">Your data is yours. We build with security and privacy by design.</p>
            </div>
            <div className="flex flex-col items-center p-6">
              <div className="w-12 h-12 rounded-full bg-[var(--accent-main)]/10 text-[var(--accent-main)] flex items-center justify-center mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-bold mb-2">Excellence</h3>
              <p className="text-sm text-[var(--text-muted)]">Relentless pursuit of state-of-the-art performance and reliability.</p>
            </div>
            <div className="flex flex-col items-center p-6">
              <div className="w-12 h-12 rounded-full bg-[var(--accent-main)]/10 text-[var(--accent-main)] flex items-center justify-center mb-4">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="font-bold mb-2">Inclusivity</h3>
              <p className="text-sm text-[var(--text-muted)]">Building AI that serves everyone, regardless of geography or background.</p>
            </div>
          </div>
        </motion.div>
        
        <div className="text-center mt-16 pt-8 border-t border-[var(--border-main)] text-[var(--text-muted)] text-sm">
          Created by Md. Sakib Mehfuz
        </div>
      </div>
    </motion.div>
  );
};
