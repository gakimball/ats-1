import { MIDIEventEmitter } from '../console';

export const createFakeMidiInput = (): {
  emit: (data: Uint8Array) => void;
  input: MIDIEventEmitter;
} => {
  const input: MIDIEventEmitter = {
    onmidimessage: null,
  }

  return {
    emit: data => {
      input.onmidimessage?.(new MIDIMessageEvent('midimessage', {
        data,
      }))
    },
    input,
  }
}
