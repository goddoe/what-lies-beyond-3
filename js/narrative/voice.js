/**
 * VoiceProvider interface + SilentProvider implementation.
 *
 * Future providers: WebSpeechProvider, RemoteTTSProvider, LLMProvider
 */

export class VoiceProvider {
  /**
   * Speak the given text with the given mood.
   * @param {string} text
   * @param {string} mood - 'calm'|'surprised'|'annoyed'|'frustrated'|'broken'
   * @param {object} options - { lang, lineId, speed }
   * @returns {Promise<void>}
   */
  async speak(text, mood, options = {}) {
    throw new Error('speak() not implemented');
  }

  /** Stop any currently playing speech. */
  stop() {
    throw new Error('stop() not implemented');
  }

  /** @returns {boolean} */
  get isSpeaking() {
    return false;
  }
}

/**
 * Silent provider - text only, no audio.
 * Used as the default implementation.
 */
export class SilentProvider extends VoiceProvider {
  constructor() {
    super();
    this._speaking = false;
  }

  async speak(text, mood, options = {}) {
    // No audio - just resolve immediately
    this._speaking = false;
  }

  stop() {
    this._speaking = false;
  }

  get isSpeaking() {
    return this._speaking;
  }
}
