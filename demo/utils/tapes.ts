import bootScript from 'bundle-text:../../examples/boot.eno'
import visualizerScript from 'bundle-text:../../examples/visualizer.eno'
import midiInputScript from 'bundle-text:../../examples/midi-input.eno'

export interface TapeDefinition {
  name: string;
  description: string;
  contents: string;
}

export const TAPES: TapeDefinition[] = [
  {
    name: 'boot',
    description: 'Boot animation',
    contents: bootScript,
  },
  {
    name: 'visualizer',
    description: 'Audio visualizer',
    contents: visualizerScript,
  },
  {
    name: 'midi-input',
    description: 'User MIDI input test',
    contents: midiInputScript,
  },
]
