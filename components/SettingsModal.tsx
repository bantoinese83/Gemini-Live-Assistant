import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Volume2, 
  Globe, 
  Mic, 
  Headphones, 
  Languages, 
  Save,
  RotateCcw,
  Check,
  AlertCircle
} from 'lucide-react';

// Available voices for Gemini Live API
export const AVAILABLE_VOICES = [
  { id: 'Orus', name: 'Orus', description: 'Professional male voice', gender: 'male', language: 'en-US' },
  { id: 'Nova', name: 'Nova', description: 'Friendly female voice', gender: 'female', language: 'en-US' },
  { id: 'Echo', name: 'Echo', description: 'Clear male voice', gender: 'male', language: 'en-US' },
  { id: 'Luna', name: 'Luna', description: 'Warm female voice', gender: 'female', language: 'en-US' },
  { id: 'Atlas', name: 'Atlas', description: 'Deep male voice', gender: 'male', language: 'en-US' },
  { id: 'Stella', name: 'Stella', description: 'Bright female voice', gender: 'female', language: 'en-US' },
];

// Available languages for Gemini Live API
export const AVAILABLE_LANGUAGES = [
  { code: 'en-US', name: 'English (US)', flag: '🇺🇸', description: 'American English' },
  { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧', description: 'British English' },
  { code: 'es-ES', name: 'Spanish', flag: '🇪🇸', description: 'Spanish (Spain)' },
  { code: 'es-MX', name: 'Spanish (Mexico)', flag: '🇲🇽', description: 'Spanish (Mexico)' },
  { code: 'fr-FR', name: 'French', flag: '🇫🇷', description: 'French' },
  { code: 'de-DE', name: 'German', flag: '🇩🇪', description: 'German' },
  { code: 'it-IT', name: 'Italian', flag: '🇮🇹', description: 'Italian' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', flag: '🇧🇷', description: 'Portuguese (Brazil)' },
  { code: 'pt-PT', name: 'Portuguese (Portugal)', flag: '🇵🇹', description: 'Portuguese (Portugal)' },
  { code: 'ja-JP', name: 'Japanese', flag: '🇯🇵', description: 'Japanese' },
  { code: 'ko-KR', name: 'Korean', flag: '🇰🇷', description: 'Korean' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', flag: '🇨🇳', description: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', flag: '🇹🇼', description: 'Chinese (Traditional)' },
  { code: 'ru-RU', name: 'Russian', flag: '🇷🇺', description: 'Russian' },
  { code: 'ar-SA', name: 'Arabic', flag: '🇸🇦', description: 'Arabic' },
  { code: 'hi-IN', name: 'Hindi', flag: '🇮🇳', description: 'Hindi' },
  { code: 'nl-NL', name: 'Dutch', flag: '🇳🇱', description: 'Dutch' },
  { code: 'sv-SE', name: 'Swedish', flag: '🇸🇪', description: 'Swedish' },
  { code: 'da-DK', name: 'Danish', flag: '🇩🇰', description: 'Danish' },
  { code: 'no-NO', name: 'Norwegian', flag: '🇳🇴', description: 'Norwegian' },
  { code: 'fi-FI', name: 'Finnish', flag: '🇫🇮', description: 'Finnish' },
  { code: 'pl-PL', name: 'Polish', flag: '🇵🇱', description: 'Polish' },
  { code: 'tr-TR', name: 'Turkish', flag: '🇹🇷', description: 'Turkish' },
  { code: 'he-IL', name: 'Hebrew', flag: '🇮🇱', description: 'Hebrew' },
  { code: 'th-TH', name: 'Thai', flag: '🇹🇭', description: 'Thai' },
  { code: 'vi-VN', name: 'Vietnamese', flag: '🇻🇳', description: 'Vietnamese' },
  { code: 'id-ID', name: 'Indonesian', flag: '🇮🇩', description: 'Indonesian' },
  { code: 'ms-MY', name: 'Malay', flag: '🇲🇾', description: 'Malay' },
  { code: 'fil-PH', name: 'Filipino', flag: '🇵🇭', description: 'Filipino' },
];

// Settings interface
export interface VoiceSettings {
  voiceId: string;
  languageCode: string;
  speechRate: number; // 0.25 to 4.0
  pitch: number; // -20.0 to 20.0
  volume: number; // 0.0 to 1.0
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
    }
  }, [open, currentSettings]);

  const handleSave = async () => {
    if (isRecording) {
      return; // Don't allow changes during recording
    }

    setIsSaving(true);
    try {
      await onSaveSettings(settings);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
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

  const handleSpeechRateChange = (value: number) => {
    setSettings(prev => ({ ...prev, speechRate: value }));
  };

  const handlePitchChange = (value: number) => {
    setSettings(prev => ({ ...prev, pitch: value }));
  };

  const handleVolumeChange = (value: number) => {
    setSettings(prev => ({ ...prev, volume: value }));
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

          {/* Voice Parameters */}
          <div className="mt-8 space-y-6">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
              <Headphones className="w-5 h-5 text-[var(--color-accent-yellow)]" />
              Voice Parameters
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Speech Rate */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
                  Speech Rate: {settings.speechRate}x
                </label>
                <input
                  type="range"
                  min="0.25"
                  max="4.0"
                  step="0.25"
                  value={settings.speechRate}
                  onChange={(e) => handleSpeechRateChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-[var(--color-background-tertiary)] rounded-lg appearance-none cursor-pointer slider"
                  disabled={isRecording}
                />
                <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                  <span>Slow</span>
                  <span>Normal</span>
                  <span>Fast</span>
                </div>
              </div>

              {/* Pitch */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
                  Pitch: {settings.pitch > 0 ? '+' : ''}{settings.pitch}
                </label>
                <input
                  type="range"
                  min="-20"
                  max="20"
                  step="1"
                  value={settings.pitch}
                  onChange={(e) => handlePitchChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-[var(--color-background-tertiary)] rounded-lg appearance-none cursor-pointer slider"
                  disabled={isRecording}
                />
                <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                  <span>Low</span>
                  <span>Normal</span>
                  <span>High</span>
                </div>
              </div>

              {/* Volume */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
                  Volume: {Math.round(settings.volume * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-[var(--color-background-tertiary)] rounded-lg appearance-none cursor-pointer slider"
                  disabled={isRecording}
                />
                <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                  <span>Quiet</span>
                  <span>Normal</span>
                  <span>Loud</span>
                </div>
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