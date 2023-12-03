import { ForthConsoleButton, NOTE_OFF, NOTE_ON, buttonCodes, buttonKeyMap } from './constants';
import { ForthMachine } from '../../src/forth'
import { toHexColor } from './to-hex-color';

export interface MIDIEventEmitter {
  onmidimessage: ((event: MIDIMessageEvent) => void) | null;
}

export class ForthConsole {
  private buttons: {
    [key in ForthConsoleButton]: boolean;
  } = {
    up: false,
    down: false,
    left: false,
    right: false,
    a: false,
    b: false,
    c: false,
    d: false,
  };

  private notes = new Set<number>();

  private connectMidi = false;

  private rafHandle = -1;

  private midiInput: MIDIEventEmitter | undefined

  handleKeyEvent = (event: KeyboardEvent) => {
    if (event.code in buttonKeyMap) {
      this.buttons[buttonKeyMap[event.code]] = event.type === 'keydown'
    }
  }

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

    // if (this.connectMidi) {
    //   midiOutput?.send(event.data)
    // }
  }

  start(
    script: string,
    canvas: HTMLCanvasElement,
    midiInput: MIDIEventEmitter,
  ) {
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error(`No drawing context`)
    }

    ctx.imageSmoothingEnabled = false

    const forth = new ForthMachine({
      'rect()': ({ variable, num, pop, tuple }) => {
        // ( rect{} color -- )
        const color = toHexColor(num(pop()))
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
        const color = toHexColor(num(pop()))
        const to = tuple('vec{}', pop())
        const from = tuple('vec{}', pop())

        ctx.strokeStyle = color
        ctx.beginPath()
        ctx.moveTo(num(from.x), num(from.y))
        ctx.lineTo(num(to.x), num(to.y))
        ctx.closePath()
        ctx.stroke()
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
      'connect_midi()': () => {
        // ( -- )
        this.connectMidi = true
      },
    })

    forth.execute(`
      tup vec{}
        .x 0 .y 0
      end

      tup rect{}
        .x 0 .y 0 .w 0 .h 0
      end

      0 0 128 128 rect{} const gfx/tv!
      [ 0xffffff 0x000000 0xff0000 0x72dec2 ] const gfx/pal/default!
      gfx/pal/default var gfx/pal!

      ( vec color -- )
      fn pixel()
        let color!
        let vec!

        vec .x vec .y 1 1 rect{} color rect()
      end

      cls()
    `)

    window.addEventListener('keydown', this.handleKeyEvent)
    window.addEventListener('keyup', this.handleKeyEvent)

    if (midiInput) {
      midiInput.onmidimessage = this.handleMidiInput
      this.midiInput = midiInput
    }

    forth.execute(script)

    const draw = () => {
      forth.execute('game()')
      window.requestAnimationFrame(draw)
    }

    this.rafHandle = window.requestAnimationFrame(draw)
  }

  stop() {
    window.removeEventListener('keydown', this.handleKeyEvent)
    window.removeEventListener('keyup', this.handleKeyEvent)
    window.cancelAnimationFrame(this.rafHandle)

    if (this.midiInput) {
      this.midiInput.onmidimessage = null
    }
  }
}
