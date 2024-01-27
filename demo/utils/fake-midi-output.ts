import { Frequency, PolySynth, Synth } from 'tone'
import type { MIDIEventHandler } from './audio-telesystem';
import { NOTE_OFF, NOTE_ON } from './constants';

export const createFakeMidiOutput = (): MIDIEventHandler => {
  const synth = new PolySynth(Synth).toDestination()

  return {
    send: data => {
      const command = data[0] >> 4;
      const pitch = Frequency(data[1], 'midi').toFrequency();
      const velocity = data.length > 2 ? data[2] : 1;

      if (command === NOTE_OFF || (command === NOTE_ON && velocity === 0)) {
        synth.triggerRelease([pitch])
      } else if (command === NOTE_ON) {
        synth.triggerAttack([pitch], undefined, velocity)
      }
    },
    dispose: () => {
      synth.releaseAll()
    }
  }
}
