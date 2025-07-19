import React, { useState, useCallback } from 'react';
import { Download, FileText, Video, Archive, CheckCircle, AlertCircle } from 'lucide-react';
import type { SupabaseSession, SupabaseTranscript, SessionAnalysisResult } from '../types';

interface SessionDownloaderProps {
  session: SupabaseSession;
  transcripts: SupabaseTranscript[];
  videoUrl: string | null;
  audioUrl: string | null;
  sessionAnalysis?: SessionAnalysisResult | null;
  onClose?: () => void;
}

interface DownloadFormat {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  formats: {
    id: string;
    name: string;
    extension: string;
    mimeType: string;
  }[];
}

const downloadFormats: DownloadFormat[] = [
  {
    id: 'transcript',
    name: 'Transcript',
    description: 'Conversation text with timestamps',
    icon: <FileText className="w-5 h-5" />,
    formats: [
      { id: 'txt', name: 'Plain Text', extension: '.txt', mimeType: 'text/plain' },
      { id: 'json', name: 'JSON', extension: '.json', mimeType: 'application/json' },
      { id: 'csv', name: 'CSV', extension: '.csv', mimeType: 'text/csv' },
      { id: 'srt', name: 'SRT Subtitles', extension: '.srt', mimeType: 'text/plain' }
    ]
  },
  {
    id: 'media',
    name: 'Media Files',
    description: 'Audio and video recordings',
    icon: <Video className="w-5 h-5" />,
    formats: [
      { id: 'audio', name: 'Audio Only', extension: '.webm', mimeType: 'audio/webm' },
      { id: 'video', name: 'Video', extension: '.webm', mimeType: 'video/webm' }
    ]
  },
  {
    id: 'analysis',
    name: 'Session Analysis',
    description: 'AI-generated insights and metrics',
    icon: <Archive className="w-5 h-5" />,
    formats: [
      { id: 'json', name: 'JSON Report', extension: '.json', mimeType: 'application/json' },
      { id: 'txt', name: 'Text Summary', extension: '.txt', mimeType: 'text/plain' }
    ]
  }
];

const SessionDownloader: React.FC<SessionDownloaderProps> = ({
  session,
  transcripts,
  videoUrl,
  audioUrl,
  sessionAnalysis,
  onClose
}) => {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<Record<string, 'idle' | 'downloading' | 'success' | 'error'>>({});

  const formatTimestamp = (timestamp_ms: number): string => {
    const hours = Math.floor(timestamp_ms / 3600000);
    const minutes = Math.floor((timestamp_ms % 3600000) / 60000);
    const seconds = Math.floor((timestamp_ms % 60000) / 1000);
    const milliseconds = timestamp_ms % 1000;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  const generateTranscriptText = useCallback((format: string): string => {
    const sortedTranscripts = [...transcripts].sort((a, b) => a.timestamp_ms - b.timestamp_ms);
    
    switch (format) {
      case 'txt':
        return sortedTranscripts.map(t => 
          `[${formatTimestamp(t.timestamp_ms)}] ${t.speaker.toUpperCase()}: ${t.text}`
        ).join('\n\n');
      
      case 'srt':
        return sortedTranscripts.map((t, index) => 
          `${index + 1}\n${formatTimestamp(t.timestamp_ms)} --> ${formatTimestamp(t.timestamp_ms + 1000)}\n${t.text}\n`
        ).join('\n');
      
      case 'csv':
        const csvHeader = 'Timestamp,Speaker,Text,Is Final\n';
        const csvRows = sortedTranscripts.map(t => 
          `"${formatTimestamp(t.timestamp_ms)}","${t.speaker}","${t.text.replace(/"/g, '""')}","${t.is_final}"`
        ).join('\n');
        return csvHeader + csvRows;
      
      case 'json':
        return JSON.stringify({
          session: {
            id: session.id,
            persona: session.persona,
            started_at: session.started_at,
            ended_at: session.ended_at,
            metadata: session.metadata
          },
          transcripts: sortedTranscripts,
          total_turns: sortedTranscripts.length,
          duration_ms: session.ended_at ? 
            new Date(session.ended_at).getTime() - new Date(session.started_at).getTime() : 
            Date.now() - new Date(session.started_at).getTime()
        }, null, 2);
      
      default:
        return '';
    }
  }, [transcripts, session]);

  const generateAnalysisText = useCallback((format: string): string => {
    if (!sessionAnalysis) return '';
    
    switch (format) {
      case 'json':
        return JSON.stringify({
          session: {
            id: session.id,
            persona: session.persona,
            started_at: session.started_at,
            ended_at: session.ended_at
          },
          analysis: sessionAnalysis
        }, null, 2);
      
      case 'txt':
        return `Session Analysis Report
=====================

Session ID: ${session.id}
Persona: ${session.persona}
Started: ${new Date(session.started_at).toLocaleString()}
${session.ended_at ? `Ended: ${new Date(session.ended_at).toLocaleString()}` : ''}

Summary:
${sessionAnalysis.summary}

Key Metrics:
- Duration: ${Math.round(sessionAnalysis.keyMetrics.duration / 60)} minutes
- User Turns: ${sessionAnalysis.keyMetrics.userTurns}
- AI Turns: ${sessionAnalysis.keyMetrics.aiTurns}
${sessionAnalysis.keyMetrics.sentiment ? `- Sentiment: ${sessionAnalysis.keyMetrics.sentiment}` : ''}

Insights:
${sessionAnalysis.insights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}

${sessionAnalysis.quiz ? `
Quiz Questions:
${sessionAnalysis.quiz.map((q, i) => `${i + 1}. Q: ${q.question}\n   A: ${q.answer}`).join('\n\n')}` : ''}`;
      
      default:
        return '';
    }
  }, [sessionAnalysis, session]);

  const downloadFile = useCallback(async (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const downloadMedia = useCallback(async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Media download failed:', error);
      throw error;
    }
  }, []);

  const handleDownload = useCallback(async (categoryId: string, formatId: string) => {
    const downloadId = `${categoryId}-${formatId}`;
    setDownloading(downloadId);
    setDownloadStatus(prev => ({ ...prev, [downloadId]: 'downloading' }));

    try {
      const sessionDate = new Date(session.started_at).toISOString().split('T')[0];
      const baseFilename = `session-${session.id}-${sessionDate}`;

      switch (categoryId) {
        case 'transcript':
          const transcriptContent = generateTranscriptText(formatId);
          const transcriptFilename = `${baseFilename}-transcript${downloadFormats[0].formats.find(f => f.id === formatId)?.extension}`;
          await downloadFile(transcriptContent, transcriptFilename, downloadFormats[0].formats.find(f => f.id === formatId)?.mimeType || 'text/plain');
          break;

        case 'media':
          if (formatId === 'audio' && audioUrl) {
            await downloadMedia(audioUrl, `${baseFilename}-audio.webm`);
          } else if (formatId === 'video' && videoUrl) {
            await downloadMedia(videoUrl, `${baseFilename}-video.webm`);
          } else {
            throw new Error('Media file not available');
          }
          break;

        case 'analysis':
          if (!sessionAnalysis) {
            throw new Error('Session analysis not available');
          }
          const analysisContent = generateAnalysisText(formatId);
          const analysisFilename = `${baseFilename}-analysis${downloadFormats[2].formats.find(f => f.id === formatId)?.extension}`;
          await downloadFile(analysisContent, analysisFilename, downloadFormats[2].formats.find(f => f.id === formatId)?.mimeType || 'text/plain');
          break;
      }

      setDownloadStatus(prev => ({ ...prev, [downloadId]: 'success' }));
      setTimeout(() => {
        setDownloadStatus(prev => ({ ...prev, [downloadId]: 'idle' }));
      }, 2000);

    } catch (error) {
      console.error('Download failed:', error);
      setDownloadStatus(prev => ({ ...prev, [downloadId]: 'error' }));
      setTimeout(() => {
        setDownloadStatus(prev => ({ ...prev, [downloadId]: 'idle' }));
      }, 3000);
    } finally {
      setDownloading(null);
    }
  }, [session, transcripts, videoUrl, audioUrl, sessionAnalysis, generateTranscriptText, generateAnalysisText, downloadFile, downloadMedia]);

  const getStatusIcon = (status: 'idle' | 'downloading' | 'success' | 'error') => {
    switch (status) {
      case 'downloading':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Download className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-[var(--color-background-primary)] rounded-lg border border-[var(--color-border-primary)] p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Download Session</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            ×
          </button>
        )}
      </div>

      <div className="space-y-6">
        {downloadFormats.map((category) => (
          <div key={category.id} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="text-[var(--color-accent-blue)]">
                {category.icon}
              </div>
              <div>
                <h4 className="font-medium text-[var(--color-text-primary)]">{category.name}</h4>
                <p className="text-sm text-[var(--color-text-secondary)]">{category.description}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {category.formats.map((format) => {
                const downloadId = `${category.id}-${format.id}`;
                const status = downloadStatus[downloadId] || 'idle';
                const isDisabled = downloading === downloadId || 
                  (category.id === 'media' && format.id === 'audio' && !audioUrl) ||
                  (category.id === 'media' && format.id === 'video' && !videoUrl) ||
                  (category.id === 'analysis' && !sessionAnalysis);

                return (
                  <button
                    key={format.id}
                    onClick={() => handleDownload(category.id, format.id)}
                    disabled={isDisabled}
                    className={`
                      flex items-center justify-between p-3 rounded-lg border transition-all
                      ${isDisabled 
                        ? 'border-[var(--color-border-secondary)] bg-[var(--color-background-secondary)] text-[var(--color-text-muted)] cursor-not-allowed'
                        : 'border-[var(--color-border-primary)] bg-[var(--color-background-secondary)] hover:bg-[var(--color-background-tertiary)] hover:border-[var(--color-accent-blue)] text-[var(--color-text-primary)]'
                      }
                    `}
                  >
                    <span className="text-sm font-medium">{format.name}</span>
                    {getStatusIcon(status)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-[var(--color-background-secondary)] rounded-lg border border-[var(--color-border-secondary)]">
        <h5 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">Session Info</h5>
        <div className="text-xs text-[var(--color-text-secondary)] space-y-1">
          <div>ID: {session.id}</div>
          <div>Persona: {session.persona}</div>
          <div>Started: {new Date(session.started_at).toLocaleString()}</div>
          <div>Duration: {session.ended_at ? 
            Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000 / 60) : 
            Math.round((Date.now() - new Date(session.started_at).getTime()) / 1000 / 60)
          } minutes</div>
          <div>Transcripts: {transcripts.length} entries</div>
        </div>
      </div>
    </div>
  );
};

export default SessionDownloader; 