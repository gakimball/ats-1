import { FunctionComponent } from 'preact';
import { TAPES, TapeDefinition } from '../../utils/tapes';
import s from './tape.list.module.css'

interface TapeListProps {
  onSelectTape: (tape: TapeDefinition) => void;
}

export const TapeList: FunctionComponent<TapeListProps> = ({
  onSelectTape,
}) => {
  return (
    <>
      {TAPES.map(tape => (
        <button
          key={tape.name}
          className={s.tape}
          type="button"
          onClick={() => onSelectTape(tape)}
        >
          <p className={s.name}>
            {tape.name}.eno
          </p>
          <p className={s.description}>
            {tape.description}
          </p>
        </button>
      ))}
    </>
  )
}
