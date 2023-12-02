import { ForthConsoleButton, NOTE_OFF, NOTE_ON, buttonCodes, buttonKeyMap } from './constants';
import { ForthMachine } from './forth'

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

    const forth = new ForthMachine({
      'pixel()': ({ variable, num, pop }) => {
        ctx.fillStyle = `#${num(pop()).toString(16).padStart(6, '0')}`
        ctx.fillRect(num(variable('screen/x')), num(variable('screen/y')), 1, 1)
      },
      'rect()': ({ variable, num, pop, tuple }) => {
        const hexColor = num(pop()).toString(16).padStart(6, '0')
        const rect = tuple('rect{}', pop())

        ctx.fillStyle = `#${hexColor}`
        ctx.fillRect(num(rect.x), num(rect.y), num(rect.w), num(rect.h))
      },
      'cls()': () => {
        ctx.clearRect(0, 0, 128, 128)
      },
      'notes()': ({ push }) => {
        push([...this.notes])
      },
      'connect_midi()': () => {
        this.connectMidi = true
      },
    })

    forth.execute(`
      tup rect{}
        .x 0 .y 0 .w 0 .h 0
      end

      var tv 0 0 128 128 rect{} tv!
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
