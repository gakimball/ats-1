import { FunctionComponent } from 'preact';
import s from './piano.module.css'

interface PianoProps {
  onNoteOff: (note: number) => void;
  onNoteOn: (note: number) => void;
}

const NOTES: Array<{
  note: number,
  label: string,
  key: string,
}> = [
  {
    note: 60,
    label: 'C',
    key: 'a',
  },
  {
    note: 62,
    label: 'D',
    key: 's',
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
    note: 67,
    label: 'G',
    key: 'g',
  },
  {
    note: 69,
    label: 'A',
    key: 'h',
  },
  {
    note: 71,
    label: 'B',
    key: 'j',
  },
]

export const Piano: FunctionComponent<PianoProps> = ({
  onNoteOff,
  onNoteOn,
}) => {
  return (
    <div className={s.container}>
      {NOTES.map(note => (
        <button
          key={note.note}
          className={s.key}
          type="button"
          onMouseDown={() => onNoteOn(note.note)}
          onMouseUp={() => onNoteOff(note.note)}
        >
          {note.key}
        </button>
      ))}
    </div>
  )
}
