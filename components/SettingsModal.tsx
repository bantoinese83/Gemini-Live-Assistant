import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Volume2, 
  Globe, 
  Mic, 
  Languages, 
  Save,
  RotateCcw,
  Check,
  AlertCircle
} from 'lucide-react';

// Available voices for Gemini Live API (Half-cascade models)
// Source: https://ai.google.dev/gemini-api/docs/live-api/capabilities#change-voice-and-language
export const AVAILABLE_VOICES = [
  { id: 'Puck', name: 'Puck', description: 'Clear and professional male voice', gender: 'male', language: 'en-US' },
  { id: 'Charon', name: 'Charon', description: 'Deep and authoritative male voice', gender: 'male', language: 'en-US' },
  { id: 'Kore', name: 'Kore', description: 'Warm and friendly female voice', gender: 'female', language: 'en-US' },
  { id: 'Fenrir', name: 'Fenrir', description: 'Strong and confident male voice', gender: 'male', language: 'en-US' },
  { id: 'Aoede', name: 'Aoede', description: 'Melodic and expressive female voice', gender: 'female', language: 'en-US' },
  { id: 'Leda', name: 'Leda', description: 'Gentle and caring female voice', gender: 'female', language: 'en-US' },
  { id: 'Orus', name: 'Orus', description: 'Professional and articulate male voice', gender: 'male', language: 'en-US' },
  { id: 'Zephyr', name: 'Zephyr', description: 'Smooth and engaging male voice', gender: 'male', language: 'en-US' },
];

// Available languages for Gemini Live API
// Source: https://ai.google.dev/gemini-api/docs/live-api/capabilities#change-voice-and-language
// Note: Native audio models automatically choose language and don't support explicit language setting
export const AVAILABLE_LANGUAGES = [
  { code: 'de-DE', name: 'German (Germany)', flag: '🇩🇪', description: 'German' },
  { code: 'en-AU', name: 'English (Australia)', flag: '🇦🇺', description: 'Australian English' },
  { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧', description: 'British English' },
  { code: 'en-IN', name: 'English (India)', flag: '🇮🇳', description: 'Indian English' },
  { code: 'en-US', name: 'English (US)', flag: '🇺🇸', description: 'American English' },
  { code: 'es-US', name: 'Spanish (US)', flag: '🇺🇸', description: 'US Spanish' },
  { code: 'fr-FR', name: 'French (France)', flag: '🇫🇷', description: 'French' },
  { code: 'hi-IN', name: 'Hindi (India)', flag: '🇮🇳', description: 'Hindi' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', flag: '🇧🇷', description: 'Brazilian Portuguese' },
  { code: 'ar-XA', name: 'Arabic (Generic)', flag: '🇸🇦', description: 'Arabic' },
  { code: 'es-ES', name: 'Spanish (Spain)', flag: '🇪🇸', description: 'Spanish' },
  { code: 'fr-CA', name: 'French (Canada)', flag: '🇨🇦', description: 'Canadian French' },
  { code: 'id-ID', name: 'Indonesian (Indonesia)', flag: '🇮🇩', description: 'Indonesian' },
  { code: 'it-IT', name: 'Italian (Italy)', flag: '🇮🇹', description: 'Italian' },
  { code: 'ja-JP', name: 'Japanese (Japan)', flag: '🇯🇵', description: 'Japanese' },
  { code: 'tr-TR', name: 'Turkish (Turkey)', flag: '🇹🇷', description: 'Turkish' },
  { code: 'vi-VN', name: 'Vietnamese (Vietnam)', flag: '🇻🇳', description: 'Vietnamese' },
  { code: 'bn-IN', name: 'Bengali (India)', flag: '🇮🇳', description: 'Bengali' },
  { code: 'gu-IN', name: 'Gujarati (India)', flag: '🇮🇳', description: 'Gujarati' },
  { code: 'kn-IN', name: 'Kannada (India)', flag: '🇮🇳', description: 'Kannada' },
  { code: 'mr-IN', name: 'Marathi (India)', flag: '🇮🇳', description: 'Marathi' },
  { code: 'ml-IN', name: 'Malayalam (India)', flag: '🇮🇳', description: 'Malayalam' },
  { code: 'ta-IN', name: 'Tamil (India)', flag: '🇮🇳', description: 'Tamil' },
  { code: 'te-IN', name: 'Telugu (India)', flag: '🇮🇳', description: 'Telugu' },
  { code: 'nl-NL', name: 'Dutch (Netherlands)', flag: '🇳🇱', description: 'Dutch' },
  { code: 'ko-KR', name: 'Korean (South Korea)', flag: '🇰🇷', description: 'Korean' },
  { code: 'cmn-CN', name: 'Mandarin Chinese (China)', flag: '🇨🇳', description: 'Mandarin Chinese' },
  { code: 'pl-PL', name: 'Polish (Poland)', flag: '🇵🇱', description: 'Polish' },
  { code: 'ru-RU', name: 'Russian (Russia)', flag: '🇷🇺', description: 'Russian' },
  { code: 'th-TH', name: 'Thai (Thailand)', flag: '🇹🇭', description: 'Thai' },
];

// Settings interface for Gemini Live API
// Only voiceName and languageCode are supported by the API
export interface VoiceSettings {
  voiceId: string;
  languageCode: string;
}

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  currentSettings: VoiceSettings;
  onSaveSettings: (settings: VoiceSettings) => void;
  isRecording: boolean;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onClose,
  currentSettings,
  onSaveSettings,
  isRecording
}) => {
  const [settings, setSettings] = useState<VoiceSettings>(currentSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Check for changes
  useEffect(() => {
    const changed = JSON.stringify(settings) !== JSON.stringify(currentSettings);
    setHasChanges(changed);
  }, [settings, currentSettings]);

  // Reset to current settings when modal opens
  useEffect(() => {
    if (open) {
      setSettings(currentSettings);
      setHasChanges(false);
      setShowSuccess(false);
      setSaveError(null);
    }
  }, [open, currentSettings]);

  const handleSave = async () => {
    if (isRecording) {
      return; // Don't allow changes during recording
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      await onSaveSettings(settings);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(currentSettings);
    setHasChanges(false);
  };

  const handleVoiceChange = (voiceId: string) => {
    setSettings(prev => ({ ...prev, voiceId }));
  };

  const handleLanguageChange = (languageCode: string) => {
    setSettings(prev => ({ ...prev, languageCode }));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--color-background-primary)] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-[var(--color-border-primary)]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border-primary)]">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-[var(--color-accent-blue)]" />
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Voice & Language Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--color-background-secondary)] transition-colors duration-200"
            aria-label="Close settings"
          >
            <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Voice Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Volume2 className="w-5 h-5 text-[var(--color-accent-blue)]" />
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">AI Voice</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {AVAILABLE_VOICES.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => handleVoiceChange(voice.id)}
                    className={`p-4 rounded-lg border transition-all duration-200 text-left hover:bg-[var(--color-background-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)] ${
                      settings.voiceId === voice.id
                        ? 'border-[var(--color-accent-blue)] bg-[var(--color-accent-blue)]/10 ring-2 ring-[var(--color-accent-blue)]/30'
                        : 'border-[var(--color-border-primary)] bg-[var(--color-background-secondary)]'
                    }`}
                    disabled={isRecording}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        voice.gender === 'male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'
                      }`}>
                        {voice.gender === 'male' ? '👨' : '👩'}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-[var(--color-text-primary)]">{voice.name}</div>
                        <div className="text-sm text-[var(--color-text-secondary)]">{voice.description}</div>
                      </div>
                      {settings.voiceId === voice.id && (
                        <Check className="w-5 h-5 text-[var(--color-accent-blue)]" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Language Selection */}
            <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-[var(--color-accent-green)]" />
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Language</h3>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Note: Native audio models automatically choose the appropriate language and don't support explicit language setting.
            </p>
              
              <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                {AVAILABLE_LANGUAGES.map((language) => (
                  <button
                    key={language.code}
                    onClick={() => handleLanguageChange(language.code)}
                    className={`w-full p-3 rounded-lg border transition-all duration-200 text-left hover:bg-[var(--color-background-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-green)] ${
                      settings.languageCode === language.code
                        ? 'border-[var(--color-accent-green)] bg-[var(--color-accent-green)]/10 ring-2 ring-[var(--color-accent-green)]/30'
                        : 'border-[var(--color-border-primary)] bg-[var(--color-background-secondary)]'
                    }`}
                    disabled={isRecording}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{language.flag}</span>
                      <div className="flex-1">
                        <div className="font-semibold text-[var(--color-text-primary)]">{language.name}</div>
                        <div className="text-sm text-[var(--color-text-secondary)]">{language.description}</div>
                      </div>
                      {settings.languageCode === language.code && (
                        <Check className="w-5 h-5 text-[var(--color-accent-green)]" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>



          {/* Recording Warning */}
          {isRecording && (
            <div className="mt-6 p-4 bg-[var(--color-accent-yellow)]/10 border border-[var(--color-accent-yellow)]/20 rounded-lg">
              <div className="flex items-center gap-2 text-[var(--color-accent-yellow)]">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Settings cannot be changed while recording</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {saveError && (
            <div className="mt-6 p-4 bg-[var(--color-accent-red)]/10 border border-[var(--color-accent-red)]/20 rounded-lg">
              <div className="flex items-center gap-2 text-[var(--color-accent-red)]">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Error: {saveError}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-[var(--color-border-primary)] bg-[var(--color-background-secondary)]">
          <button
            onClick={handleReset}
            disabled={!hasChanges || isRecording}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--color-border-primary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-tertiary)] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          
          <div className="flex items-center gap-3">
            {showSuccess && (
              <div className="flex items-center gap-2 text-[var(--color-accent-green)]">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">Settings saved!</span>
              </div>
            )}
            
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[var(--color-border-primary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-tertiary)] transition-colors duration-200"
            >
              Cancel
            </button>
            
            <button
              onClick={handleSave}
              disabled={!hasChanges || isRecording || isSaving}
              className="flex items-center gap-2 px-6 py-2 bg-[var(--color-accent-blue)] text-white rounded-lg hover:bg-[var(--color-accent-blue-hover)] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal; 