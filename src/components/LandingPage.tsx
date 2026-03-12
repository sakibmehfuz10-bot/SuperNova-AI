import React from 'react';
import { motion } from 'motion/react';
import { Logo } from "./Logo";
import { Globe, Languages, Zap, Brain, Search, Sparkles, ChevronRight } from 'lucide-react';

export const LandingPage: React.FC<{ onGetStarted: () => void }> = ({ onGetStarted }) => {
  return (
    <div className="flex-1 overflow-y-auto bg-[var(--bg-main)] text-[var(--text-main)]">
      {/* Hero Section */}
      <section className="relative py-20 px-8 flex flex-col items-center text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-main)]/10 text-[var(--accent-main)] text-sm font-bold mb-6">
            <Logo className="w-6 h-6" />
            <span>India's AI Revolution</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-serif font-bold tracking-tight mb-6">
            SuperNova AI: <span className="text-[var(--accent-main)]">Empowering India</span>
          </h1>
          <p className="text-xl text-[var(--text-muted)] mb-10 leading-relaxed">
            The next generation of intelligence, built with a deep understanding of India's diverse languages, cultures, and aspirations.
          </p>
          <button 
            onClick={onGetStarted}
            className="px-8 py-4 bg-[var(--accent-main)] text-white rounded-2xl font-bold text-lg shadow-lg hover:scale-[1.02] transition-transform flex items-center gap-2 mx-auto"
          >
            Get Started <ChevronRight className="w-5 h-5" />
          </button>
        </motion.div>
      </section>

      {/* India-First Focus */}
      <section className="py-20 px-8 bg-[var(--surface-main)]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-serif font-bold text-center mb-16">India-First Focus</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Languages, title: "Multilingual Mastery", desc: "Support for major Indian languages with deep cultural context." },
              { icon: Globe, title: "Regional Nuance", desc: "Trained on localized data to understand regional idioms and references." },
              { icon: Brain, title: "Inclusive Accessibility", desc: "Optimized for diverse devices and low-bandwidth environments." }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="p-8 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-3xl shadow-sm"
              >
                <item.icon className="w-10 h-10 text-[var(--accent-main)] mb-6" />
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-[var(--text-muted)]">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Capabilities */}
      <section className="py-20 px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-serif font-bold text-center mb-16">Core Capabilities</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              { icon: Zap, title: "Advanced Reasoning", desc: "Solve complex problems with cutting-edge logical analysis." },
              { icon: Search, title: "Real-time Grounding", desc: "Get accurate, up-to-date information powered by Google Search." },
              { icon: Sparkles, title: "Creative Generation", desc: "Generate high-quality images and text tailored to your needs." },
              { icon: Brain, title: "Efficient Performance", desc: "Lightning-fast responses designed for productivity." }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="flex items-start gap-6 p-8 bg-[var(--surface-main)] border border-[var(--border-main)] rounded-3xl"
              >
                <item.icon className="w-12 h-12 text-[var(--accent-main)] flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-[var(--text-muted)]">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
