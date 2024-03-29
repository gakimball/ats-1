import conwayScript from 'bundle-text:../../examples/conway.eno'
import shapesScript from 'bundle-text:../../examples/shapes.eno'
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
    name: 'conway',
    description: 'Conway\'s Game of LIfe',
    contents: conwayScript,
  },
  {
    name: 'shapes',
    description: 'Shape drawing/MIDI CC',
    contents: shapesScript,
  },
  {
    name: 'boot',
    description: 'Boot animation',
    contents: bootScript,
  },
  {
    name: 'midi-input',
    description: 'User MIDI input test',
    contents: midiInputScript,
  },
  {
    name: 'visualizer',
    description: 'Audio visualizer',
    contents: visualizerScript,
  },
]
