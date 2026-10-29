import type { Language } from '../types.js';

/**
 * Speech adapter interfaces (STT + TTS). Mock implementations only.
 * Live providers plug in behind these interfaces once credentials are supplied.
 */
export interface STTAdapter {
  readonly name: string;
  transcribe(audio: Buffer, language: Language): Promise<{ text: string }>;
}

export interface TTSAdapter {
  readonly name: string;
  synthesize(text: string, language: Language): Promise<{ audio: Buffer }>;
}

export class MockSTTAdapter implements STTAdapter {
  readonly name = 'mock';
  async transcribe() {
    return { text: '[mock transcription]' };
  }
}

export class MockTTSAdapter implements TTSAdapter {
  readonly name = 'mock';
  async synthesize() {
    return { audio: Buffer.from('mock-audio') };
  }
}

export function getSTTAdapter(): STTAdapter {
  return new MockSTTAdapter();
}
export function getTTSAdapter(): TTSAdapter {
  return new MockTTSAdapter();
}
