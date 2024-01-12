import * as Tone from 'tone'
import { Midi } from '@tonejs/midi'
import { CONTROL_CHANGE, NOTE_OFF, NOTE_ON } from './constants';
import { EVM } from '../../src/evm'
import { PALETTE } from './palette';
import { FONT } from './font';
import atsStdLib from 'bundle-text:./ats-stdlib.eno'
import { EVMTuple, TUPLE_TYPE } from '../../src/types/machine-type';
import { createTuple } from '../../src/utils/create-tuple';

export interface MIDIEventEmitter {
  onmidimessage: ((event: MIDIMessageEvent) => void) | null;
}

export interface MIDIEventHandler {
  send: (data: Uint8Array) => void;
  dispose?: () => void;
}

interface ATSNote extends EVMTuple {
  pitch: number;
  velocity: number;
}

interface ATSFile {
  buffer: ArrayBuffer;
  file: EVMTuple & {
    name: string;
  };
}

export class AudioTeleSystem {
  private prevNotes = new Set<ATSNote>();

  private notes = new Set<ATSNote>();

  private connectMidi = false;

  private rafHandle = -1;

  private midiInput?: MIDIEventEmitter

  private midiOutput?: MIDIEventHandler

  private midiCC: number[] = []

  private isRunning = true

  private files: ATSFile[] = []

  constructor(
    private readonly onError: (error: Error) => void,
  ) {}

  handleMidiInput = (data: Uint8Array, sendToOutput: boolean) => {
    const command = data[0] >> 4;
    const pitch = data[1];
    const velocity = data.length > 2 ? data[2] : 1;

    if (command === NOTE_OFF || (command === NOTE_ON && velocity === 0)) {
      const note = Array.from(this.notes).find(note => note.pitch === pitch)

      if (note) { this.notes.delete(note) }
    } else if (command === NOTE_ON) {
      this.notes.add(createTuple('note{}', {
        pitch,
        velocity,
      }))
    } else if (command === CONTROL_CHANGE) {
      this.midiCC[data[1]] = data[2]
    }

    if (sendToOutput) {
      this.midiOutput?.send(data)
    }
  }

  start(
    script: string,
    ctx: CanvasRenderingContext2D,
    midiInput: MIDIEventEmitter,
    midiOutput: MIDIEventHandler,
  ) {
    ctx.imageSmoothingEnabled = false

    const evm = new EVM({
      'rect()': ({ num, pop, tuple }) => {
        // ( rect{} color -- )
        const color = PALETTE[num(pop())]
        const rect = tuple('rect{}', pop())

        ctx.fillStyle = color
        ctx.fillRect(
          Math.round(num(rect.x)),
          Math.round(num(rect.y)),
          Math.round(num(rect.w)),
          Math.round(num(rect.h)),
        )
      },
      'spr()': ({ pop, num, list, tuple, execute, push }) => {
        // ( rect{} chr[] -- )
        const chr = list(pop())
        const rect = tuple('rect{}', pop())
        const x = Math.round(num(rect.x))
        const y = Math.round(num(rect.y))

        // Adapted from: https://wiki.xxiivv.com/site/chr_format.html
        for (let v = 0; v < 8; v++) {
          for (let h = 0; h < 8; h++) {
            const channel1 = (num(chr[v]) >> h) & 0x1;
            const channel2 = ((num(chr[v + 8]) >> h) & 0x1) << 1;
            const colorIndex = channel1 + channel2

            push(x + 7 - h)
            push(y + v)
            execute(`vec{} gfx/pal ${colorIndex} get pixel()`)
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
        ctx.moveTo(Math.round(num(from.x)), Math.round(num(from.y)))
        ctx.lineTo(Math.round(num(to.x)), Math.round(num(to.y)))
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
        ctx.clearRect(0, 0, 128, 128)
      },
      'midi-cc()': ({ pop, num, push }) => {
        const id = num(pop())

        push(this.midiCC[id] ?? 0)
      },
      'route-midi()': () => {
        // ( -- )
        this.connectMidi = true
      },
      'file/play()': ({ num, pop, tuple }) => {
        // ( index -- )
        const file = tuple('file{}', pop())
        const midiFile = this.files.find(item => item.file.name === file.name)

        if (!midiFile) {
          throw new Error(`MIDI file ${file.name} does not exist`)
        }

        this.startFilePlayback(midiFile.buffer)
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
    midiInput.onmidimessage = evt => this.handleMidiInput((evt as MIDIMessageEvent).data, this.connectMidi)

    evm.execute(atsStdLib)
    evm.execute(`
      [ ${PALETTE.map((_, index) => index).join(' ')} ] const gfx/colors!
    `)
    evm.setVariable('#files', this.files.map(file => file.file))

    try {
      evm.execute(script)
    } catch (error: unknown) {
      this.handleError(error)
    }

    const draw = () => {
      if (this.isRunning) {
        try {
          evm.setVariable('#notes', Array.from(this.notes))
          evm.setVariable('#notes-pressed', Array.from(this.notes).filter(note => !this.prevNotes.has(note)))
          this.prevNotes = new Set(this.notes.values())
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
    this.stopFilePlayback()

    if (this.midiInput) {
      this.midiInput.onmidimessage = null
    }
  }

  addMidiFile(filename: string, buffer: ArrayBuffer) {
    this.files.push({
      buffer,
      file: createTuple('file{}', { name: filename })
    })
  }

  private handleError(error: unknown) {
    this.isRunning = false

    if (error instanceof Error) {
      this.onError(error)
    }
  }

  private startFilePlayback(arrayBuffer: ArrayBuffer) {
    const now = Tone.now() + 0.5
    const midi = new Midi(arrayBuffer)

    midi.tracks.forEach(track => {
      track.notes.forEach(note => {
        const time = now + note.time

        Tone.Transport.scheduleOnce(() => {
          this.handleMidiInput(new Uint8Array([
            NOTE_ON << 4,
            note.midi,
            1,
          ]), true)
        }, time)

        Tone.Transport.scheduleOnce(() => {
          this.handleMidiInput(new Uint8Array([
            NOTE_OFF << 4,
            note.midi,
            1,
          ]), true)
        }, time + note.duration)
      })
    })

    Tone.Transport.start()
  }

  private stopFilePlayback() {
    Tone.Transport.stop()
  }
}
