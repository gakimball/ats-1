import { FunctionComponent } from 'preact'
import { useState, useRef } from 'preact/hooks'
import copyTextToClipboard from 'copy-text-to-clipboard'
import { MIDIStatus } from '../midi-status/midi-status'
import { AudioTeleSystem } from '../../utils/audio-telesystem'
import { useEventHandler } from '../../hooks/use-event-handler'
import { NOTE_OFF, NOTE_ON } from '../../utils/constants'
import { createFakeMidiInput } from '../../utils/fake-midi-input'
import { Piano } from '../piano/piano'
import { PaletteViewer } from '../palette-viewer/palette-viewer'
import { PALETTE } from '../../utils/palette'
import { Editor, EditorRef } from '../editor/editor'
import { Header } from '../header/header'
import bootScript from 'bundle-text:../../../examples/boot.eno'
import { NavItem } from '../nav-item/nav-item'
import s from './app.module.css'
import { createFakeMidiOutput } from '../../utils/fake-midi-output'
import { ChangeEvent } from 'preact/compat'
import { createMidiSpeaker } from '../../utils/midi-speaker'

type AppPane = 'palette'

export const App: FunctionComponent = () => {
  const [midi, setMidi] = useState<MIDIAccess>()
  const [inputId, setInputId] = useState<string>()
  const [isRunning, setIsRunning] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>()
  const [visiblePane, setVisiblePane] = useState<AppPane>()

  const editorRef = useRef<EditorRef>(null)
  const drawingContextRef = useRef<CanvasRenderingContext2D>()
  const systemRef = useRef<AudioTeleSystem>()
  const fakeMidiRef = useRef(createFakeMidiInput())
  const fileUploadRef = useRef<HTMLInputElement>(null)

  const connectMidi = useEventHandler(async () => {
    const access = await navigator.requestMIDIAccess()

    console.log('MIDI connected', { midi: access })

    setMidi(access)
  })

  const stopGame = useEventHandler(() => {
    systemRef.current?.stop()
    systemRef.current = undefined
    drawingContextRef.current?.clearRect(0, 0, 128, 128)

    setIsRunning(false)
  })

  const runGame = useEventHandler(async () => {
    const midiInput = (inputId
      ? midi?.inputs.get(inputId)
      : undefined)
      ?? fakeMidiRef.current.input

    if (!drawingContextRef.current || !editorRef.current) {
      return
    }

    const evm = new AudioTeleSystem(setErrorMessage)
    const midiFile = await fileUploadRef.current?.files?.[0]?.arrayBuffer()
    if (midiFile) { evm.addMidiFile(midiFile) }
    systemRef.current = evm
    setIsRunning(true)

    evm.start(
      editorRef.current.getValue(),
      drawingContextRef.current,
      midiInput,
      createFakeMidiOutput(),
      createMidiSpeaker(),
    )
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

  const togglePane = useEventHandler((pane: AppPane) => {
    setVisiblePane(prev => {
      return prev === pane ? undefined : pane
    })
  })

  const copyColor = useEventHandler((hexCode: string) => {
    copyTextToClipboard(hexCode)
    setVisiblePane(undefined)
  })

  return (
    <>
      <div className={s.container}>
        <div className={s.header}>
          <Header>
            <input
              ref={fileUploadRef}
              type="file"
              allow="midi"
            />
            <NavItem onClick={() => togglePane('palette')}>
              Palette
            </NavItem>
          </Header>
        </div>
        <div className={s.left}>
          <Editor ref={editorRef} defaultValue={bootScript} />
          {errorMessage && (
            <div className={s.error}>
              {errorMessage}
            </div>
          )}
          <button
            className={s.button}
            type="button"
            onClick={isRunning ? stopGame : runGame}
          >
            {isRunning ? 'Stop game' : 'Run game'}
          </button>
        </div>
        <div className={s.right}>
          <canvas
            ref={e => {
              drawingContextRef.current = e?.getContext('2d') ?? undefined
            }}
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
              isActive={isRunning}
              onNoteOn={sendNoteOn}
              onNoteOff={sendNoteOff}
            />
          )}
        </div>
      </div>
      {visiblePane && (
        <div className={s.pane}>
          {visiblePane === 'palette' && (
            <PaletteViewer
              colors={PALETTE}
              onSelectColor={copyColor}
            />
          )}
        </div>
      )}
    </>
  )
}
