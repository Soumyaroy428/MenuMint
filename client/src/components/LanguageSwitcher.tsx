import React from 'react';
import { SupportedLanguage } from '../types';
import { LANGUAGES } from '../utils/i18n';
import { Globe } from 'lucide-react';

interface LanguageSwitcherProps {
  currentLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  variant?: 'compact' | 'full';
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  currentLanguage,
  onLanguageChange,
  variant = 'compact',
}) => {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
      <Globe size={14} color="#059669" />
      <select
        aria-label="Switch Language"
        value={currentLanguage}
        onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
        style={{
          fontSize: '0.78rem',
          fontWeight: 700,
          padding: '0.3rem 0.5rem',
          borderRadius: 6,
          border: '1px solid #cbd5e1',
          background: '#ffffff',
          color: '#334155',
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {variant === 'full' ? lang.label : lang.code.toUpperCase()}
          </option>
        ))}
      </select>
    </div>
  );
};
