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

// --- Perlin Noise 1D Implementation ---
// Adapted from https://github.com/joeiddon/perlin/blob/master/perlin.js (MIT)
const permutation = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54, 65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152, 2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
const p = new Array(512);
for (let i = 0; i < 512; i++) p[i] = permutation[i % 256];

function fade(t: number): number { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(t: number, a: number, b: number): number { return a + t * (b - a); }
function grad(hash: number, x: number): number { return (hash & 1) === 0 ? x : -x; }

export function perlinNoise1D(x: number): number {
  const X = Math.floor(x) & 255;
  x -= Math.floor(x);
  const u = fade(x);
  const a = p[X];
  const b = p[X + 1];
  return lerp(u, grad(a, x), grad(b, x - 1));
}

export { createBlob, decode, decodeAudioData, encode };
