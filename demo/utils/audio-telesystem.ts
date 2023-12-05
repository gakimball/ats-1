import { NOTE_OFF, NOTE_ON } from './constants';
import { EVM } from '../../src/evm'
import { PALETTE } from './palette';
import { FONT } from './font';

export interface MIDIEventEmitter {
  onmidimessage: ((event: MIDIMessageEvent) => void) | null;
}

export interface MIDIEventHandler {
  send: (data: Uint8Array) => void;
  dispose?: () => void;
}

export class AudioTeleSystem {
  private notes = new Set<number>();

  private connectMidi = false;

  private rafHandle = -1;

  private midiInput?: MIDIEventEmitter

  private midiOutput?: MIDIEventHandler

  private isRunning = true

  constructor(
    private readonly onError: (errorMessage: string) => void,
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
      'text()': ({ pop, list, tuple, num, execute }) => {
        // ( vec{} chars[] -- )
        const chars = list(pop())
        const vec = tuple('vec{}', pop())
        const x = num(vec.x)
        const y = num(vec.y)

        chars.forEach((value, index) => {
          const code = num(value)
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
      'notes()': ({ push }) => {
        // ( -- notes[] )
        push([...this.notes])
      },
      'connect-midi()': () => {
        // ( -- )
        this.connectMidi = true
      },
    })

    this.isRunning = true

    evm.execute(`
      tup vec{}
        .x 0 .y 0
      end

      ( vec vec|num -- vec' )
      fn vec/add()
        let b!
        let a!

        b is-num if?
          a ~.x b + .x!
            ~.y b + .y!
        else
          a ~.x b .x + .x!
            ~.y b .y + .y!
        end
      end

      ( vec factor -- vec' )
      fn vec/scale()
        let b!
        let a!

        a ~.x b * .x!
          !.y b * .y!
      end

      ( vec vec -- product )
      fn vec/dot()
        let b!
        let a!

        a .x b .x *
        a .y b .y *
        +
      end

      ( incident normal -- vec )
      fn vec/bounce()
        let normal!
        let incident!

        normal
        incident normal vec/dot() 2 *
        vec/scale()

        ( todo: need support for negative numbers )
      end

      tup rect{}
        .x 0 .y 0 .w 0 .h 0
      end

      0 0 128 128 rect{} const gfx/tv!
      [ 0x0d 0x13 0x2c 0x30 ] const gfx/pal/default!
      gfx/pal/default var gfx/pal!

      ( vec color -- )
      fn pixel()
        let color!
        let vec!

        vec .x vec .y 1 1 rect{} color rect()
      end

      cls()
    `)

    this.midiInput = midiInput
    this.midiOutput = midiOutput
    midiInput.onmidimessage = this.handleMidiInput

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

    if (this.midiInput) {
      this.midiInput.onmidimessage = null
    }
  }

  private handleError(error: unknown) {
    this.isRunning = false

    if (error instanceof Error) {
      this.onError(error.message)
    }
  }
}
