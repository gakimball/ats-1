import { Midi } from '@tonejs/midi'
import { CONTROL_CHANGE, NOTE_OFF, NOTE_ON } from './constants';
import { EVM } from '../../src/evm'
import { PALETTE } from './palette';
import { FONT } from './font';
import atsStdLib from 'bundle-text:./ats-stdlib.eno'
import { TUPLE_TYPE } from '../../src/types/machine-type';
import { EVMError } from '../../src/utils/evm-error';

export interface MIDIEventEmitter {
  onmidimessage: ((event: MIDIMessageEvent) => void) | null;
}

export interface MIDIEventHandler {
  send: (data: Uint8Array) => void;
  dispose?: () => void;
}

export interface MIDISpeakerNote {
  pitch: number;
  velocity: number;
  duration: number;
}

export interface MIDISpeaker {
  play: (midi: Midi) => void;
  stop: () => void;
  onNote: ((note: MIDISpeakerNote, isOn: boolean) => void) | null;
}

export class AudioTeleSystem {
  private notes = new Set<number>();

  private connectMidi = false;

  private rafHandle = -1;

  private midiInput?: MIDIEventEmitter

  private midiOutput?: MIDIEventHandler

  private midiSpeaker?: MIDISpeaker

  private midiCC: number[] = []

  private isRunning = true

  private midiFiles: Array<{
    filename: string;
    buffer: ArrayBuffer;
  }> = []

  private songNotes = new Set<MIDISpeakerNote>()

  constructor(
    private readonly onError: (error: EVMError) => void,
  ) {}

  handleMidiInput = (evt: Event) => {
    const event = evt as MIDIMessageEvent
    const command = event.data[0] >> 4;
    const pitch = event.data[1];
    const velocity = event.data.length > 2 ? event.data[2] : 1;

    if (command === NOTE_OFF || (command === NOTE_ON && velocity === 0)) {
      this.notes.delete(pitch)
    } else if (command === NOTE_ON) {
      this.notes.add(pitch)
    } else if (command === CONTROL_CHANGE) {
      console.log(event)
      this.midiCC[event.data[1]] = event.data[2]
    }

    if (this.connectMidi) {
      this.midiOutput?.send(event.data)
    }
  }

  start(
    script: string,
    ctx: CanvasRenderingContext2D,
    midiInput: MIDIEventEmitter,
    midiOutput: MIDIEventHandler,
    midiSpeaker: MIDISpeaker,
  ) {
    ctx.imageSmoothingEnabled = false

    const evm = new EVM({
      'rect()': ({ variable, num, pop, tuple }) => {
        // ( rect{} color -- )
        const color = PALETTE[num(pop())]
        const rect = tuple('rect{}', pop())

        ctx.fillStyle = color
        ctx.fillRect(num(rect.x), num(rect.y), num(rect.w), num(rect.h))
      },
      'spr()': ({ pop, num, list, tuple, execute, push }) => {
        // ( rect{} chr[] -- )
        const chr = list(pop())
        const rect = tuple('rect{}', pop())
        const x = num(rect.x)
        const y = num(rect.y)

        // Adapted from: https://wiki.xxiivv.com/site/chr_format.html
        for (let v = 0; v < 8; v++) {
          for (let h = 0; h < 8; h++) {
            const channel1 = (num(chr[v]) >> h) & 0x1;
            const channel2 = ((num(chr[v + 8]) >> h) & 0x1) << 1;
            const colorIndex = channel1 + channel2

            push(x + 7 - h)
            push(y + v)
            execute(`vec{} gfx/pal ${colorIndex} index pixel()`)
          }
        }
      },
      'line()': ({ pop, num, tuple }) => {
        // ( from to color -- )
        const color = PALETTE[num(pop())]
        const to = tuple('vec{}', pop())
        const from = tuple('vec{}', pop())

        ctx.strokeStyle = color
        ctx.beginPath()
        ctx.moveTo(num(from.x), num(from.y))
        ctx.lineTo(num(to.x), num(to.y))
        ctx.closePath()
        ctx.stroke()
      },
      'text()': ({ pop, tuple, num, string, execute }) => {
        // ( vec{} string -- )
        const chars = string(pop()).split('')
        const vec = tuple('vec{}', pop())
        const x = num(vec.x)
        const y = num(vec.y)

        chars.forEach((value, index) => {
          const code = value.charCodeAt(0)
          const sprite = [
            ...FONT[code],
            ...Array(8).fill(0),
          ]
          const offset = index * 8

          execute(`${x + offset} ${y} 1 1 rect{} [ ${sprite.join(' ')} ] spr()`)
        })
      },
      'cls()': () => {
        // ( -- )
        ctx.fillStyle = '#000000'
        ctx.fillRect(0, 0, 128, 128)
      },
      'midi/input-notes()': ({ push }) => {
        // ( -- notes[] )
        push(Array.from(this.notes))
      },
      'midi/file-notes()': ({ push }) => {
        // ( -- notes[] )
        push(Array.from(this.songNotes).map(note => ({
          [TUPLE_TYPE]: 'note{}',
          ...note,
        })))
      },
      'midi/cc()': ({ pop, num, push }) => {
        const id = num(pop())

        push(this.midiCC[id] ?? 0)
      },
      'midi/route()': () => {
        // ( -- )
        this.connectMidi = true
      },
      'midi/get-files()': ({ push }) => {
        push(this.midiFiles.map((file, index) => ({
          [TUPLE_TYPE]: 'file{}',
          name: file.filename,
          handle: index,
        })))
      },
      'midi/play-file()': ({ num, pop, tuple }) => {
        // ( index -- )
        const file = tuple('file{}', pop())
        const midiFile = this.midiFiles[num(file.handle)]

        if (!midiFile) {
          throw new Error(`MIDI file ${file.name} does not exist`)
        }

        this.midiSpeaker?.play(new Midi(midiFile.buffer))
      },
      'random()': ({ num, pop, push }) => {
        // ( min max -- num )
        const max = num(pop())
        const min = num(pop())

        push(
          Math.floor(
            (Math.random() * (max - min + 1)) + min
          )
        )
      },
      'sin()': ({ num, pop, push }) => {
        push(Math.sin(num(pop())))
      },
      'cos()': ({ num, pop, push }) => {
        push(Math.cos(num(pop())))
      },
      'tan()': ({ num, pop, push }) => {
        push(Math.tan(num(pop())))
      },
      'pi()': ({ push }) => {
        push(Math.PI)
      }
    })

    this.isRunning = true
    this.midiInput = midiInput
    this.midiOutput = midiOutput
    this.midiSpeaker = midiSpeaker
    midiInput.onmidimessage = this.handleMidiInput
    midiSpeaker.onNote = (note, isOn) => {
      if (isOn) {
        this.songNotes.add(note)
      } else {
        this.songNotes.delete(note)
      }
    }

    evm.execute(atsStdLib)
    evm.execute(`
      [ ${PALETTE.map((_, index) => index).join(' ')} ] const gfx/colors!
    `)

    try {
      evm.execute(script)
    } catch (error: unknown) {
      this.handleError(error)
    }

    const draw = () => {
      if (this.isRunning) {
        try {
          evm.execute('game()')
        } catch (error: unknown) {
          this.handleError(error)
        }

        window.requestAnimationFrame(draw)
      }
    }

    this.rafHandle = window.requestAnimationFrame(draw)
  }

  stop() {
    this.isRunning = false
    window.cancelAnimationFrame(this.rafHandle)
    this.midiOutput?.dispose?.()
    this.midiSpeaker?.stop()

    if (this.midiInput) {
      this.midiInput.onmidimessage = null
    }
  }

  addMidiFile(filename: string, buffer: ArrayBuffer) {
    this.midiFiles.push({ filename, buffer })
  }

  private handleError(error: unknown) {
    this.isRunning = false

    if (error instanceof EVMError) {
      this.onError(error)
    }
  }
}
