import * as Tone from 'tone';
import { MIDISpeaker } from './audio-telesystem';

export const createMidiSpeaker = (): MIDISpeaker => {
  const synths: Tone.PolySynth[] = []

  return {
    // Borrowed from: https://github.com/Tonejs/Midi/blob/master/examples/load.html
    play(midi) {
      const now = Tone.now() + 0.5

      console.log('Playing!', midi)

      midi.tracks.forEach(track => {
        const synth = new Tone.PolySynth(Tone.Synth, {
          envelope: {
            attack: 0.02,
            decay: 0.1,
            sustain: 0.3,
            release: 1
          }
        }).toDestination()

        synths.push(synth)

        track.notes.forEach(note => {
          const time = note.time + now
          const event = {
            pitch: note.midi,
            velocity: note.velocity,
            duration: note.duration
          }

          synth.triggerAttackRelease(note.name, note.duration, time, note.velocity)

          Tone.Transport.scheduleOnce(() => {
            this.onNote?.(event, true)
          }, time)

          Tone.Transport.scheduleOnce(() => {
            this.onNote?.(event, false)
          }, time + note.duration)
        })

        Tone.Transport.start()
      })
    },
    stop: () => {
      synths.forEach(synth => synth.dispose())
    },
    onNote: null,
  }
}
