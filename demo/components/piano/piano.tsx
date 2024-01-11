import { FunctionComponent } from 'preact';
import s from './piano.module.css'
import { useEffect, useState } from 'preact/hooks';
import { useEventHandler } from '../../hooks/use-event-handler';

interface PianoProps {
  isActive: boolean;
  onNoteOff: (note: number) => void;
  onNoteOn: (note: number) => void;
}

const NOTES: Array<{
  note: number;
  label: string;
  key: string;
  isMinor?: boolean;
}> = [
  {
    note: 60,
    label: 'C',
    key: 'a',
  },
  {
    note: 61,
    label: 'C#',
    key: 'w',
    isMinor: true,
  },
  {
    note: 62,
    label: 'D',
    key: 's',
  },
  {
    note: 63,
    label: 'D#',
    key: 'e',
    isMinor: true,
  },
  {
    note: 64,
    label: 'E',
    key: 'd',
  },
  {
    note: 65,
    label: 'F',
    key: 'f',
  },
  {
    note: 66,
    label: 'F#',
    key: 't',
    isMinor: true,
  },
  {
    note: 67,
    label: 'G',
    key: 'g',
  },
  {
    note: 68,
    label: 'G#',
    key: 'y',
    isMinor: true,
  },
  {
    note: 69,
    label: 'A',
    key: 'h',
  },
  {
    note: 70,
    label: 'A#',
    key: 'u',
    isMinor: true,
  },
  {
    note: 71,
    label: 'B',
    key: 'j',
  },
]

export const Piano: FunctionComponent<PianoProps> = ({
  isActive,
  onNoteOff,
  onNoteOn,
}) => {
  const [pressedKeys, setPressedKeys] = useState(new Set<number>())

  const pressKey = useEventHandler((note: number) => {
    onNoteOn(note)
    setPressedKeys(prev => {
      const next = new Set(prev)
      next.add(note)
      return next
    })
  })

  const releaseKey = useEventHandler((note: number) => {
    onNoteOff(note)
    setPressedKeys(prev => {
      const next = new Set(prev)
      next.delete(note)
      return next
    })
  })

  useEffect(() => {
    const handleEvent = (event: KeyboardEvent) => {
      if (event.repeat) {
        return
      }

      const note = NOTES.find(note => note.key === event.key)

      if (!note) { return }

      if (event.type === 'keydown') {
        pressKey(note.note)
      } else {
        releaseKey(note.note)
      }
    }

    if (isActive) {
      window.addEventListener('keydown', handleEvent)
      window.addEventListener('keyup', handleEvent)
    }

    return () => {
      window.removeEventListener('keydown', handleEvent)
      window.removeEventListener('keyup', handleEvent)
    }
  }, [isActive, pressKey, releaseKey])

  return (
    <div
      className={`
        ${s.container}
        ${isActive ? s.isActive : ''}
      `}
    >
      {NOTES.map(note => (
        <div className={s.keyWrapper}>
          <button
            key={note.note}
            className={`
              ${s.key}
              ${note.isMinor ? s.isMinor : ''}
              ${pressedKeys.has(note.note) ? s.isPressed : ''}
            `}
            type="button"
            onMouseDown={() => pressKey(note.note)}
            onMouseUp={() => releaseKey(note.note)}
          >
            {note.key}
          </button>
        </div>
      ))}
    </div>
  )
}
