import { supabase } from './supabaseClient';
import type { SupabaseSession, SupabaseTranscript } from '../types';

export async function createSession(session: Omit<SupabaseSession, 'id' | 'started_at' | 'created_at'>) {
  const { data, error } = await supabase
    .from('sessions')
    .insert([{ ...session }])
    .select()
    .single();
  if (error) throw error;
  return data as SupabaseSession;
}

export async function addTranscript(transcript: Omit<SupabaseTranscript, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('transcripts')
    .upsert([{ ...transcript }], { onConflict: ['session_id', 'speaker'] })
    .select()
    .single();
  if (error) throw error;
  return data as SupabaseTranscript;
}

export async function uploadSessionVideo(sessionId: string, file: File | Blob) {
  if (!(file instanceof Blob) || file.size === 0) {
    throw new Error('No video recorded or video file is empty.');
  }
  const filePath = `${sessionId}/${Date.now()}.webm`;
  const { data, error } = await supabase.storage
    .from('session-videos')
    .upload(filePath, file, { upsert: true });
  if (error) {
    console.error('Supabase video upload error:', error);
    throw error;
  }
  // Only return the file path; playback will use signed URLs.
  return { path: filePath };
}

export async function getSession(sessionId: string) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();
  if (error) throw error;
  return data as SupabaseSession;
}

export async function getTranscripts(sessionId: string) {
  const { data, error } = await supabase
    .from('transcripts')
    .select('*')
    .eq('session_id', sessionId)
    .order('timestamp_ms', { ascending: true });
  if (error) throw error;
  return data as SupabaseTranscript[];
} 