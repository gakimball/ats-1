import { FunctionComponent } from 'preact'
import { useState, useRef, useCallback, useEffect } from 'preact/hooks'
import copyTextToClipboard from 'copy-text-to-clipboard'
import classnames from 'classnames/bind'
import { MIDIStatus } from '../midi-status/midi-status'
import { AudioTeleSystem } from '../../utils/audio-telesystem'
import { useEventHandler } from '../../hooks/use-event-handler'
import { NOTE_OFF, NOTE_ON, PROGRAM_CHANGE } from '../../utils/constants'
import { createFakeMidiInput } from '../../utils/fake-midi-input'
import { Piano } from '../piano/piano'
import { PaletteViewer } from '../palette-viewer/palette-viewer'
import { PALETTE } from '../../utils/palette'
import { Editor, EditorRef } from '../editor/editor'
import { Header } from '../header/header'
import { NavItem } from '../nav-item/nav-item'
import { createFakeMidiOutput } from '../../utils/fake-midi-output'
import { EVMError } from '../../../src/utils/evm-error'
import { TapeList } from '../tape-list/tape-list'
import { TAPES, TapeDefinition } from '../../utils/tapes'
import s from './app.module.css'
import { MidiCC, MidiCCRef } from '../midi-cc/midi-cc'
import { MidiPC } from '../midi-pc/midi-pc'

type AppPane = 'palette' | 'tapes' | 'midi'

const cls = classnames.bind(s)

export const App: FunctionComponent = () => {
  const [midi, setMidi] = useState<MIDIAccess>()
  const [inputId, setInputId] = useState<string>()
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<Error>()
  const [visiblePane, setVisiblePane] = useState<AppPane>()
  const [tape, setTape] = useState(TAPES[0])
  const [ccLabels, setCCLabels] = useState<string[]>([])
  const [midiProgram, setMidiProgram] = useState(0)

  const editorRef = useRef<EditorRef>(null)
  const canvasRef = useRef<HTMLCanvasElement>()
  const drawingContextRef = useRef<CanvasRenderingContext2D>()
  const systemRef = useRef<AudioTeleSystem>()
  const fakeMidiRef = useRef(createFakeMidiInput())
  const fileUploadRef = useRef<HTMLInputElement>(null)
  const midiCCRef = useRef<MidiCCRef>(null)

  const loadTape = useEventHandler((value: TapeDefinition) => {
    setTape(value)
    setVisiblePane(undefined)
    setCCLabels([])

    value.contents.split('\n').forEach(line => {
      if (line.startsWith('(#CC')) {
        const ccData = line.slice(1, -1).split(' ').slice(1)
        const ccId = Number.parseInt(ccData[0], 10)
        const label = ccData[1]
        const defaultValue = Number.parseInt(ccData[2], 10)

        midiCCRef.current?.setValue(
          ccId,
          Number.isNaN(defaultValue) ? 0 : defaultValue,
        )
        setCCLabels(prev => {
          const next = [...prev]
          next[ccId] = label
          return next
        })
      }
    })
  })

  useEffect(() => {
    loadTape(tape)
  }, [])

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

    const evm = new AudioTeleSystem(setError)
    const midiFile = fileUploadRef.current?.files?.[0]
    if (midiFile) { evm.addMidiFile(midiFile.name, await midiFile.arrayBuffer()) }
    systemRef.current = evm
    setIsRunning(true)

    evm.start(
      editorRef.current.getValue(),
      drawingContextRef.current,
      midiInput,
      createFakeMidiOutput(),
    )
    midiCCRef.current?.transmitAllValues()
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

  const sendMIDIMessage = useEventHandler((message: Uint8Array) => {
    fakeMidiRef.current.emit(message)
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

  const handleProgramChange = useEventHandler((value: number) => {
    setMidiProgram(value)
    sendMIDIMessage(new Uint8Array([
      PROGRAM_CHANGE << 4,
      value,
    ]))
  })

  return (
    <>
      <div className={s.container}>
        <div className={s.header}>
          <Header>
            <NavItem onClick={() => togglePane('tapes')}>
              Tapes
            </NavItem>
            <NavItem onClick={() => togglePane('midi')}>
              Load MIDI
            </NavItem>
            <NavItem onClick={() => togglePane('palette')}>
              Palette
            </NavItem>
          </Header>
        </div>
        <div className={s.left}>
          <Editor
            key={tape.name}
            ref={editorRef}
            defaultValue={tape.contents}
          />
          {error && (
            <div className={s.error}>
              {error.message}
              {error instanceof EVMError && (
                <pre>
                  {JSON.stringify(error.data, null, 2)}
                </pre>
              )}
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
          <div className={s.canvasWrapper}>
            <canvas
              ref={e => {
                canvasRef.current = e ?? undefined
                drawingContextRef.current = e?.getContext('2d', { alpha: false }) ?? undefined
              }}
              className={s.canvas}
              width={128}
              height={128}
            ></canvas>
          </div>
          <button
            type="button"
            onClick={() => {
              canvasRef.current?.requestFullscreen()
            }}
          >
            Full screen
          </button>
          <MIDIStatus
            inputMap={midi?.inputs}
            selectedInput={inputId}
            onConnectMidi={connectMidi}
            onChangeInput={setInputId}
          />
          {!inputId && (
            <div className={s.inputArea}>
              <Piano
                isActive={isRunning}
                onNoteOn={sendNoteOn}
                onNoteOff={sendNoteOff}
              />
              <MidiCC
                ref={midiCCRef}
                onMidiMessage={sendMIDIMessage}
                ccLabels={ccLabels}
              />
              <MidiPC
                value={midiProgram}
                onChange={handleProgramChange}
              />
            </div>
          )}
        </div>
      </div>
      <div className={cls('pane', { isOpen: visiblePane === 'tapes' })}>
        <TapeList
          onSelectTape={loadTape}
        />
      </div>
      <div className={cls('pane', { isOpen: visiblePane === 'midi' })}>
        <input
          ref={fileUploadRef}
          type="file"
          accept=".mid,.midi,audio/midi,audio/x-midi"
        />
        <p className={s.notice}>Files added here are kept local.</p>
      </div>
      <div className={cls('pane', { isOpen: visiblePane === 'palette' })}>
        <PaletteViewer
          colors={PALETTE}
          onSelectColor={copyColor}
        />
        <p className={s.notice}>Select a color to copy its hex ID to the clipboard.</p>
      </div>
    </>
  )
}
