/**
 * Audio Worklet Processor for Gemini Live Assistant
 * 
 * This processor replaces the deprecated ScriptProcessorNode and provides
 * real-time audio processing for sending audio data to the Gemini Live API.
 * 
 * The processor receives audio data from the microphone, processes it,
 * and sends the PCM data back to the main thread for transmission to Gemini.
 */

class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096; // Standard buffer size
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  /**
   * Process audio data from the input
   * @param {Float32Array[][]} inputs - Array of input channels
   * @param {Float32Array[][]} outputs - Array of output channels
   * @param {Object} parameters - Audio parameters
   * @returns {boolean} - Whether to continue processing
   */
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    if (!input || !input[0]) {
      return true; // Continue processing
    }

    const inputChannel = input[0];
    const outputChannel = output[0];
    
    // Copy input to output (pass-through)
    for (let i = 0; i < inputChannel.length; i++) {
      outputChannel[i] = inputChannel[i];
    }

    // Accumulate audio data in buffer
    for (let i = 0; i < inputChannel.length; i++) {
      this.buffer[this.bufferIndex] = inputChannel[i];
      this.bufferIndex++;
      
      // When buffer is full, send data to main thread
      if (this.bufferIndex >= this.bufferSize) {
        // Create a copy of the buffer data
        const pcmData = new Float32Array(this.buffer);
        
        // Send the PCM data to the main thread
        this.port.postMessage({
          pcmData: pcmData
        });
        
        // Reset buffer index
        this.bufferIndex = 0;
      }
    }

    return true; // Continue processing
  }
}

// Register the audio processor
registerProcessor('audio-processor', AudioProcessor); 