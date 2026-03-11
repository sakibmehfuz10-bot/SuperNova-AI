const fs = require('fs');
const path = require('path');

const replacements = {
  'bg-\\[#F4F4F0\\]': 'bg-[var(--surface-hover)]',
  'bg-white': 'bg-[var(--surface-main)]',
  'text-\\[#7A7A72\\]': 'text-[var(--text-muted)]',
  'border-\\[#E2E2DC\\]': 'border-[var(--border-main)]',
  'text-\\[#4A4A42\\]': 'text-[var(--text-main)]',
  'bg-\\[#D97757\\]': 'bg-[var(--accent-main)]',
  'text-\\[#D97757\\]': 'text-[var(--accent-main)]',
  'border-\\[#D97757\\]': 'border-[var(--accent-main)]',
  'bg-\\[#FAFAF8\\]': 'bg-[var(--bg-main)]',
  'hover:bg-\\[#F4F4F0\\]': 'hover:bg-[var(--surface-hover)]',
  'hover:bg-\\[#E2E2DC\\]': 'hover:bg-[var(--border-main)]',
  'bg-white/50': 'bg-[var(--surface-main)]/50',
  'bg-white/10': 'bg-[var(--surface-main)]/10',
  'bg-white/20': 'bg-[var(--surface-main)]/20',
  'border-white/20': 'border-[var(--surface-main)]/20',
  'border-white': 'border-[var(--surface-main)]',
};

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const [key, value] of Object.entries(replacements)) {
        const regex = new RegExp(key, 'g');
        if (regex.test(content)) {
          content = content.replace(regex, value);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

walkDir('./src');
