
import type { AudioDataPart } from '../types';

/**
 * Encodes a Uint8Array into a Base64 string.
 * This is typically used for preparing binary data (like audio) for transmission in JSON payloads.
 * @param bytes - The Uint8Array to encode.
 * @returns A Base64 encoded string.
 */
function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decodes a Base64 string into a Uint8Array.
 * This is used to convert Base64 encoded data (e.g., received audio) back into binary form.
 * @param base64 - The Base64 string to decode.
 * @returns A Uint8Array containing the decoded binary data.
 */
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Converts a Float32Array of PCM audio data (typically ranging from -1.0 to 1.0)
 * into an Int16Array, scales it, and then Base64 encodes it.
 * This prepares raw audio data for sending to APIs like Gemini Live, which expect
 * audio in a specific format (e.g., 16-bit PCM at 16000Hz).
 *
 * @param data - A Float32Array containing the raw PCM audio data.
 * @returns An `AudioDataPart` object with the Base64 encoded audio data and its MIME type.
 */
function createBlob(data: Float32Array): AudioDataPart {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Convert float32 from -1.0 to 1.0 range to int16 from -32768 to 32767 range.
    int16[i] = Math.max(-32768, Math.min(32767, data[i] * 32768));
  }

  return {
    data: encode(new Uint8Array(int16.buffer)), // Encode the Int16Array buffer as Base64
    mimeType: 'audio/pcm;rate=16000', // Standard MIME type for this type of audio data
  };
}

/**
 * Decodes a Uint8Array of audio data (assumed to be Int16 PCM) into an `AudioBuffer`.
 * This is useful for playing back audio received from an API or processing it further
 * with the Web Audio API.
 *
 * @param data - A Uint8Array containing the raw audio data (expected as Int16 PCM).
 * @param ctx - The `AudioContext` instance to use for creating the `AudioBuffer`.
 * @param sampleRate - The sample rate of the audio data (e.g., 24000 for Gemini output).
 * @param numChannels - The number of audio channels (e.g., 1 for mono, 2 for stereo).
 * @returns A Promise that resolves to an `AudioBuffer`.
 */
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  // Ensure numChannels is at least 1 for createBuffer
  const validNumChannels = Math.max(1, numChannels);

  // Each sample is 2 bytes (Int16), so total bytes / 2 gives total Int16 samples.
  // Then divide by number of channels to get frames per channel.
  const frameCount = data.length / 2 / validNumChannels;
  if (frameCount < 1) {
    // Avoid errors with createBuffer for empty or insufficient data.
    console.warn('decodeAudioData: Not enough data for the specified channels, creating minimal buffer.');
    return ctx.createBuffer(validNumChannels, 1, sampleRate); // Create a 1-frame silent buffer.
  }

  const audioBuffer = ctx.createBuffer(
    validNumChannels,
    frameCount,
    sampleRate,
  );

  // Interpret the Uint8Array's underlying ArrayBuffer as Int16Array.
  // data.byteOffset and data.length ensure we only view the relevant part of the buffer if `data` is a view.
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.length / 2);
  const totalSamples = dataInt16.length;
  const dataFloat32 = new Float32Array(totalSamples);

  // Convert Int16 samples back to Float32 (normalized -1.0 to 1.0).
  for (let i = 0; i < totalSamples; i++) {
    dataFloat32[i] = dataInt16[i] / 32768.0;
  }

  if (validNumChannels === 1) {
    // For mono audio, copy the entire Float32Array to the first channel.
    audioBuffer.copyToChannel(dataFloat32, 0);
  } else {
    // For multi-channel audio, deinterleave the samples into respective channels.
    for (let channelIndex = 0; channelIndex < validNumChannels; channelIndex++) {
      const channelData = new Float32Array(frameCount);
      for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
        // Samples are interleaved: L, R, L, R ... or C1, C2, C1, C2 ...
        channelData[frameIndex] = dataFloat32[frameIndex * validNumChannels + channelIndex];
      }
      audioBuffer.copyToChannel(channelData, channelIndex);
    }
  }
  return audioBuffer;
}

export { createBlob, decode, decodeAudioData, encode };
