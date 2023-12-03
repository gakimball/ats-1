import { FunctionComponent } from 'preact'
import { useState, useRef } from 'preact/hooks'
import { MIDIStatus } from '../midi-status/midi-status'
import { ForthConsole } from '../../utils/console'
import { useEventHandler } from '../../hooks/use-event-handler'
import { DEFAULT_SCRIPT, NOTE_OFF, NOTE_ON } from '../../utils/constants'
import { createFakeMidiInput } from '../../utils/fake-midi-input'
import { Piano } from '../piano/piano'
import { PaletteViewer } from '../palette-viewer/palette-viewer'
import { PALETTE } from '../../utils/palette'
import { Editor, EditorRef } from '../editor/editor'
import s from './app.module.css'

export const App: FunctionComponent = () => {
  const [midi, setMidi] = useState<MIDIAccess>()
  const [inputId, setInputId] = useState<string>()
  const [isRunning, setIsRunning] = useState(false)

  const editorRef = useRef<EditorRef>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const consoleRef = useRef<ForthConsole>()
  const fakeMidiRef = useRef(createFakeMidiInput())

  const connectMidi = useEventHandler(async () => {
    const access = await navigator.requestMIDIAccess()

    console.log('MIDI connected', { midi: access })

    setMidi(access)
  })

  const stopGame = useEventHandler(() => {
    consoleRef.current?.stop()
    consoleRef.current = undefined

    const canvas = canvasRef.current

    if (canvas) {
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    }

    setIsRunning(false)
  })

  const runGame = useEventHandler(() => {
    const midiInput = (inputId
      ? midi?.inputs.get(inputId)
      : undefined)
      ?? fakeMidiRef.current.input

    if (!canvasRef.current || !editorRef.current) {
      return
    }

    const forth = new ForthConsole()
    consoleRef.current = forth
    setIsRunning(true)

    try {
      forth.start(editorRef.current.getValue(), canvasRef.current, midiInput)
    } catch (error: unknown) {
      stopGame()

      if (error instanceof Error) {
        console.log(`Error: ${error.message}`)
      }
    }
  })

  const sendNoteOn = useEventHandler((note: number) => {
    fakeMidiRef.current.emit(new Uint8Array([
      NOTE_ON << 4,
      note,
    ]))
  })

  const sendNoteOff = useEventHandler((note: number) => {
    fakeMidiRef.current.emit(new Uint8Array([
      NOTE_OFF << 4,
      note,
    ]))
  })

  return (
    <div className={s.container}>
      <div className={s.left}>
        <Editor ref={editorRef} defaultValue={DEFAULT_SCRIPT} />
        <button
          className={s.button}
          type="button"
          onClick={isRunning ? stopGame : runGame}
        >
          {isRunning ? 'Stop game' : 'Run game'}
        </button>
      </div>
      <div className={s.right}>
        <PaletteViewer colors={PALETTE} />
        <canvas
          ref={canvasRef}
          className={s.canvas}
          width={128}
          height={128}
        ></canvas>
        <MIDIStatus
          inputMap={midi?.inputs}
          selectedInput={inputId}
          onConnectMidi={connectMidi}
          onChangeInput={setInputId}
        />
        {!inputId && (
          <Piano
            onNoteOn={sendNoteOn}
            onNoteOff={sendNoteOff}
          />
        )}
      </div>
    </div>
  )
}
